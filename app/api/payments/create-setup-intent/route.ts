import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// Helper function to get or create Stripe customer
async function getOrCreateStripeCustomer(userId: string, email: string) {
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!sk) {
    throw new Error("Stripe not configured");
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(sk, { apiVersion: '2024-06-20' as any });

  // Check if rider has a Stripe customer ID
  const rider = await prisma.rider.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (rider?.stripeCustomerId) {
    // Verify customer exists in Stripe
    try {
      await stripe.customers.retrieve(rider.stripeCustomerId);
      return rider.stripeCustomerId;
    } catch (error) {
      // Customer doesn't exist, create a new one
      console.log("Stripe customer not found, creating new one");
    }
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: email,
    metadata: {
      userId: userId,
    },
  });

  // Save customer ID to rider
  await prisma.rider.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sk = process.env.STRIPE_SECRET_KEY;
    if (!sk) {
      // dev fallback: return fake client secret
      return NextResponse.json({ clientSecret: 'seti_test_secret' });
    }
    
    // Get user email for customer creation
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;
    
    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Ensure rider exists
    await prisma.rider.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId },
    });

    // Get or create Stripe customer
    const stripeCustomerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    // Lazy import stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(sk, { apiVersion: '2024-06-20' as any });
    
    // Create a Setup Intent for saving payment methods, associated with customer
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
    });
    
    return NextResponse.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    return NextResponse.json(
      { error: 'Failed to create setup intent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


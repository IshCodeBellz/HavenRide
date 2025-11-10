import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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

// GET all payment methods for a rider
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const methods = await prisma.paymentMethod.findMany({
      where: { riderId: userId },
      orderBy: { isDefault: "desc" },
    });

    return NextResponse.json(methods);
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 }
    );
  }
}

// POST create a new payment method
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { stripePaymentMethodId, last4, brand, expiryMonth, expiryYear, isDefault } = body;

    if (!stripePaymentMethodId || !last4 || !brand || !expiryMonth || !expiryYear) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure User exists in database first
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: userEmail,
        name: clerkUser.firstName && clerkUser.lastName
          ? `${clerkUser.firstName} ${clerkUser.lastName}`
          : clerkUser.username || null,
      },
    });

    // Ensure rider exists
    await prisma.rider.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
      },
    });

    // Get or create Stripe customer and attach payment method
    const stripeCustomerId = await getOrCreateStripeCustomer(userId, userEmail);
    
    const sk = process.env.STRIPE_SECRET_KEY;
    if (sk) {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(sk, { apiVersion: '2024-06-20' as any });
      
      // Attach payment method to customer
      await stripe.paymentMethods.attach(stripePaymentMethodId, {
        customer: stripeCustomerId,
      });
      
      console.log("Payment method attached to Stripe customer:", stripeCustomerId);
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { riderId: userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        riderId: userId,
        stripePaymentMethodId,
        last4,
        brand,
        expiryMonth,
        expiryYear,
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json(paymentMethod, { status: 201 });
  } catch (error) {
    console.error("Error creating payment method:", error);
    return NextResponse.json(
      { error: "Failed to create payment method" },
      { status: 500 }
    );
  }
}

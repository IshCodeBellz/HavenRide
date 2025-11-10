import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentMethodId, customerId } = await req.json();

    if (!paymentMethodId || !customerId) {
      return NextResponse.json(
        { error: "Payment method ID and customer ID are required" },
        { status: 400 }
      );
    }

    const sk = process.env.STRIPE_SECRET_KEY;
    if (!sk) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 500 }
      );
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(sk, { apiVersion: '2024-06-20' as any });

    // Attach payment method to customer (idempotent - won't fail if already attached)
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      return NextResponse.json({ success: true });
    } catch (error: any) {
      // If already attached, that's fine
      if (error.code === 'payment_method_already_attached') {
        return NextResponse.json({ success: true, alreadyAttached: true });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error attaching payment method:", error);
    return NextResponse.json(
      { 
        error: "Failed to attach payment method",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}


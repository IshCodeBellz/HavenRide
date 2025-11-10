import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { paymentMethodId } = await req.json();
    
    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    const sk = process.env.STRIPE_SECRET_KEY;
    if (!sk) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    // Lazy import stripe
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(sk, { apiVersion: '2024-06-20' as any });
    
    // Retrieve payment method from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    
    if (paymentMethod.type !== 'card' || !paymentMethod.card) {
      return NextResponse.json(
        { error: 'Invalid payment method type' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      id: paymentMethod.id,
      last4: paymentMethod.card.last4,
      brand: paymentMethod.card.brand,
      expiryMonth: paymentMethod.card.exp_month,
      expiryYear: paymentMethod.card.exp_year,
    });
  } catch (error) {
    console.error('Error retrieving payment method:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve payment method' },
      { status: 500 }
    );
  }
}


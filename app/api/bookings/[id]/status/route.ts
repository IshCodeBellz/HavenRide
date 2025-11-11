import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/realtime/publish";
import { sendToAccounting } from "@/lib/integrations/accounting";
import { sendReceiptEmail } from "@/lib/notifications/receipt";

async function shouldSendReceipts() {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  return s?.sendReceipts ?? true;
}

async function processRefund(paymentIntentId: string, amount?: number) {
  try {
    const sk = process.env.STRIPE_SECRET_KEY;
    if (!sk) {
      console.error("Stripe not configured, cannot process refund");
      return { success: false, error: "Stripe not configured" };
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(sk, { apiVersion: '2024-06-20' as any });

    // Retrieve the payment intent to get the amount
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Only refund if payment was successful
    if (paymentIntent.status !== 'succeeded') {
      console.log(`Payment intent ${paymentIntentId} status is ${paymentIntent.status}, no refund needed`);
      return { success: true, skipped: true };
    }

    // Create refund - if amount is specified, refund that amount, otherwise full refund
    const refundParams: any = {
      payment_intent: paymentIntentId,
    };
    
    if (amount && amount > 0) {
      // Convert amount to cents (Stripe uses smallest currency unit)
      refundParams.amount = Math.round(amount * 100);
    }

    const refund = await stripe.refunds.create(refundParams);
    
    console.log(`Refund created: ${refund.id} for payment intent ${paymentIntentId}`);
    return { success: true, refundId: refund.id };
  } catch (error: any) {
    console.error("Error processing refund:", error);
    return { 
      success: false, 
      error: error.message || "Failed to process refund" 
    };
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status, driverId } = await req.json();
  if (!status)
    return NextResponse.json({ error: "status required" }, { status: 400 });

  // Get booking before updating to check old status and payment info
  const oldBooking = await prisma.booking.findUnique({ where: { id } });
  if (!oldBooking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // Determine if this is a rider cancellation (not driver cancellation)
  // Driver cancellation: driverId is explicitly set to null in the request
  // Rider cancellation: driverId is not in the request body (undefined) or status is CANCELED without driverId: null
  const isRiderCancellation = 
    status === "CANCELED" && 
    driverId !== null; // If driverId is null, it's a driver cancellation; otherwise it's a rider cancellation

  // Process refund if rider cancels and booking has payment
  if (isRiderCancellation && oldBooking.paymentIntentId) {
    // Only refund if booking hasn't started (REQUESTED or ASSIGNED status)
    // Don't refund if driver has already arrived or ride is in progress
    if (oldBooking.status === "REQUESTED" || oldBooking.status === "ASSIGNED") {
      const refundAmount = 
        typeof oldBooking.finalFareAmount === "number"
          ? oldBooking.finalFareAmount
          : (oldBooking.priceEstimate as any)?.amount || undefined;
      
      const refundResult = await processRefund(
        oldBooking.paymentIntentId,
        refundAmount
      );
      
      if (!refundResult.success && !refundResult.skipped) {
        console.error(`Failed to refund payment for booking ${id}:`, refundResult.error);
        // Continue with cancellation even if refund fails (log error but don't block)
      }
    }
  }

  let data: any = { status };
  if (status === "ASSIGNED" && driverId) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    data.driverId = driverId;
    if (driver?.phone) data.driverPhone = driver.phone;
  } else if (status === "CANCELED" && driverId === null) {
    // Driver cancellation - set driverId to null
    data.driverId = null;
  }

  const booking = await prisma.booking.update({ where: { id }, data });

  await publish("dispatch", "booking_updated", { id, status: booking.status });
  await publish(`booking:${id}`, "status", { status: booking.status });
  // Notify rider of status changes
  await publish(`rider:${booking.riderId}`, "booking_updated", { id, status: booking.status });
  if (status === "ASSIGNED" && driverId)
    await publish(`driver:${driverId}`, "assigned", { bookingId: id });

  if (status === "COMPLETED") {
    const fare =
      typeof booking.finalFareAmount === "number"
        ? booking.finalFareAmount
        : (booking.priceEstimate as any)?.amount || 0;
    sendToAccounting({
      id: booking.id,
      riderId: booking.riderId,
      driverId: booking.driverId,
      pickupAddress: booking.pickupAddress,
      dropoffAddress: booking.dropoffAddress,
      pickupTime: booking.pickupTime.toISOString(),
      completedAt: new Date().toISOString(),
      fare: { amount: fare, currency: booking.finalFareCurrency || "GBP" },
      requiresWheelchair: booking.requiresWheelchair,
      distanceKm: booking.estimatedDistance ?? null,
      durationMin: booking.estimatedDuration ?? null,
      metadata: { status: booking.status },
    });
    if (await shouldSendReceipts()) {
      const r = await prisma.rider.findUnique({
        where: { id: booking.riderId },
        include: { user: true },
      });
      const email = r?.user?.email;
      if (email)
        sendReceiptEmail({
          toEmail: email,
          bookingId: booking.id,
          dateISO: new Date().toISOString(),
          pickup: booking.pickupAddress,
          dropoff: booking.dropoffAddress,
          fareAmount: fare,
          fareCurrency: booking.finalFareCurrency || "GBP",
          distanceKm: booking.estimatedDistance ?? null,
          durationMin: booking.estimatedDuration ?? null,
        });
    }
  }

  return NextResponse.json(booking);
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/realtime/publish";
import { sendToAccounting } from "@/lib/integrations/accounting";
import { sendReceiptEmail } from "@/lib/notifications/receipt";

async function shouldSendReceipts() {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  return s?.sendReceipts ?? true;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status, driverId } = await req.json();
  if (!status)
    return NextResponse.json({ error: "status required" }, { status: 400 });

  let data: any = { status };
  if (status === "ASSIGNED" && driverId) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    data.driverId = driverId;
    if (driver?.phone) data.driverPhone = driver.phone;
  }

  const booking = await prisma.booking.update({ where: { id }, data });

  await publish("dispatch", "booking_updated", { id, status: booking.status });
  await publish(`booking:${id}`, "status", { status: booking.status });
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

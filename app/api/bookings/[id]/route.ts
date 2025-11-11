import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/realtime/publish";

/**
 * PUT /api/bookings/[id]
 * Update booking details (dispatcher only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify dispatcher role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== "DISPATCHER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      pickupAddress,
      dropoffAddress,
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      requiresWheelchair,
      specialNotes,
      pickupTime,
    } = body;

    // Build update data object
    const updateData: any = {};
    if (pickupAddress !== undefined) updateData.pickupAddress = pickupAddress;
    if (dropoffAddress !== undefined) updateData.dropoffAddress = dropoffAddress;
    if (pickupLat !== undefined) updateData.pickupLat = pickupLat;
    if (pickupLng !== undefined) updateData.pickupLng = pickupLng;
    if (dropoffLat !== undefined) updateData.dropoffLat = dropoffLat;
    if (dropoffLng !== undefined) updateData.dropoffLng = dropoffLng;
    if (requiresWheelchair !== undefined)
      updateData.requiresWheelchair = requiresWheelchair;
    if (specialNotes !== undefined) updateData.specialNotes = specialNotes;
    if (pickupTime !== undefined) updateData.pickupTime = new Date(pickupTime);

    const booking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: {
        rider: {
          include: {
            user: true,
          },
        },
        driver: {
          include: {
            user: true,
          },
        },
      },
    });

    // Publish real-time update
    await publish("dispatch", "booking_updated", {
      id: booking.id,
      ...updateData,
    });
    await publish(`booking:${id}`, "updated", updateData);

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}



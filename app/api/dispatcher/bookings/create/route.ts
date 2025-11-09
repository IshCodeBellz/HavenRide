import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/dispatcher/bookings/create
 * Create a booking on behalf of a rider
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify dispatcher role
    const dispatcher = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!dispatcher || dispatcher.role !== "DISPATCHER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      riderIdentifier, // email or phone
      pickupAddress,
      dropoffAddress,
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      wheelchairRequired,
      scheduledFor,
      notes,
    } = body;

    // Validate required fields
    if (!riderIdentifier || !pickupAddress || !dropoffAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find or create rider
    let rider = await prisma.rider.findFirst({
      where: {
        OR: [
          { user: { email: riderIdentifier } },
          { phone: riderIdentifier },
        ],
      },
      include: {
        user: true,
      },
    });

    if (!rider) {
      // Create new user and rider
      const newUser = await prisma.user.create({
        data: {
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: riderIdentifier.includes("@")
            ? riderIdentifier
            : `${riderIdentifier.replace(/\D/g, "")}@havenride.temp`,
          name: "New Rider",
          role: "RIDER",
        },
      });

      rider = await prisma.rider.create({
        data: {
          id: newUser.id,
          phone: riderIdentifier.includes("@") ? null : riderIdentifier,
        },
        include: {
          user: true,
        },
      });
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        riderId: rider.id,
        pickupAddress,
        dropoffAddress,
        pickupLat: pickupLat || 0,
        pickupLng: pickupLng || 0,
        dropoffLat: dropoffLat || 0,
        dropoffLng: dropoffLng || 0,
        requiresWheelchair: wheelchairRequired || false,
        specialNotes: notes || null,
        pickupTime: scheduledFor ? new Date(scheduledFor) : new Date(),
        pinCode: Math.floor(1000 + Math.random() * 9000),
        status: "REQUESTED",
      },
      include: {
        rider: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}

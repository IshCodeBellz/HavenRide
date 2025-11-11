import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET driver profile data
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const driver = await prisma.driver.findUnique({
      where: { id: userId },
      select: {
        vehicleMake: true,
        vehicleModel: true,
        vehiclePlate: true,
        wheelchairCapable: true,
        phone: true,
        verificationStatus: true,
        rating: true,
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Get completed bookings to calculate rating count
    const driverBookings = await prisma.booking.findMany({
      where: {
        driverId: userId,
        status: "COMPLETED",
      },
      select: {
        id: true,
      },
    });

    let ratingCount = 0;
    let calculatedRating = driver.rating;

    if (driverBookings.length > 0) {
      const driverRatings = await prisma.rideRating.findMany({
        where: {
          bookingId: {
            in: driverBookings.map((b) => b.id),
          },
        },
        select: {
          driverRating: true,
        },
      });

      ratingCount = driverRatings.length;

      // If rating is null or 0, but we have ratings, recalculate
      if ((!driver.rating || driver.rating === 0) && driverRatings.length > 0) {
        calculatedRating =
          driverRatings.reduce((sum, r) => sum + r.driverRating, 0) /
          driverRatings.length;

        // Update the driver's rating in the database
        await prisma.driver.update({
          where: { id: userId },
          data: { rating: calculatedRating },
        });
      } else if (driverRatings.length > 0 && driver.rating) {
        calculatedRating = driver.rating;
      }
    }

    return NextResponse.json({
      ...driver,
      rating: calculatedRating,
      ratingCount,
    });
  } catch (error) {
    console.error("Error fetching driver profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch driver profile" },
      { status: 500 }
    );
  }
}

// PUT update driver profile
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { vehicleMake, vehicleModel, vehiclePlate, wheelchairCapable, phone } = body;

    // Ensure driver exists
    await prisma.driver.upsert({
      where: { id: userId },
      update: {
        vehicleMake: vehicleMake || null,
        vehicleModel: vehicleModel || null,
        vehiclePlate: vehiclePlate || null,
        wheelchairCapable: wheelchairCapable || false,
        phone: phone || null,
      },
      create: {
        id: userId,
        vehicleMake: vehicleMake || null,
        vehicleModel: vehicleModel || null,
        vehiclePlate: vehiclePlate || null,
        wheelchairCapable: wheelchairCapable || false,
        phone: phone || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating driver profile:", error);
    return NextResponse.json(
      { error: "Failed to update driver profile", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}


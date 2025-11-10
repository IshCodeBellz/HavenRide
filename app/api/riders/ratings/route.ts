import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// POST create a rating for a completed ride
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, driverRating, rideRating, driverComment, rideComment } = body;

    if (!bookingId || !driverRating || !rideRating) {
      return NextResponse.json(
        { error: "bookingId, driverRating, and rideRating are required" },
        { status: 400 }
      );
    }

    // Validate ratings (1-5)
    if (driverRating < 1 || driverRating > 5 || rideRating < 1 || rideRating > 5) {
      return NextResponse.json(
        { error: "Ratings must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Verify booking exists and belongs to rider
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.riderId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (booking.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Can only rate completed rides" },
        { status: 400 }
      );
    }

    // Check if rating already exists
    const existing = await prisma.rideRating.findUnique({
      where: { bookingId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Rating already exists for this booking" },
        { status: 400 }
      );
    }

    // Create rating
    const rating = await prisma.rideRating.create({
      data: {
        bookingId,
        riderId: userId,
        driverRating,
        rideRating,
        driverComment: driverComment || null,
        rideComment: rideComment || null,
      },
    });

    // Update driver's average rating
    if (booking.driverId) {
      const driverRatings = await prisma.rideRating.findMany({
        where: {
          booking: {
            driverId: booking.driverId,
          },
        },
        select: {
          driverRating: true,
        },
      });

      if (driverRatings.length > 0) {
        const avgRating =
          driverRatings.reduce((sum, r) => sum + r.driverRating, 0) /
          driverRatings.length;

        await prisma.driver.update({
          where: { id: booking.driverId },
          data: { rating: avgRating },
        });
      }
    }

    return NextResponse.json(rating, { status: 201 });
  } catch (error) {
    console.error("Error creating rating:", error);
    return NextResponse.json(
      { error: "Failed to create rating" },
      { status: 500 }
    );
  }
}

// GET ratings for a specific booking
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json(
        { error: "bookingId is required" },
        { status: 400 }
      );
    }

    const rating = await prisma.rideRating.findUnique({
      where: { bookingId },
      include: {
        booking: {
          select: {
            riderId: true,
          },
        },
      },
    });

    if (!rating) {
      return NextResponse.json({ error: "Rating not found" }, { status: 404 });
    }

    // Verify ownership
    if (rating.booking.riderId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(rating);
  } catch (error) {
    console.error("Error fetching rating:", error);
    return NextResponse.json(
      { error: "Failed to fetch rating" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { findBestDriver, findTopDrivers } from "@/lib/assignment/auto-assign";

/**
 * POST /api/dispatcher/auto-assign
 * Automatically assign the best available driver to a booking
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
    const { bookingId, getSuggestions = false, limit = 5 } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID required" },
        { status: 400 }
      );
    }

    // Fetch booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        pickupLat: true,
        pickupLng: true,
        requiresWheelchair: true,
        status: true,
        driverId: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "REQUESTED") {
      return NextResponse.json(
        { error: "Booking already assigned or completed" },
        { status: 400 }
      );
    }

    if (!booking.pickupLat || !booking.pickupLng) {
      return NextResponse.json(
        { error: "Booking must have pickup coordinates" },
        { status: 400 }
      );
    }

    // Fetch all online drivers
    const drivers = await prisma.driver.findMany({
      where: {
        isOnline: true,
        lastLat: { not: null },
        lastLng: { not: null },
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (drivers.length === 0) {
      return NextResponse.json(
        { error: "No online drivers available" },
        { status: 404 }
      );
    }

    // If just getting suggestions, return top drivers
    if (getSuggestions) {
      const suggestions = findTopDrivers(drivers as any, booking, limit);

      return NextResponse.json({
        suggestions: suggestions.map((result) => ({
          driverId: result.driver.id,
          driverName: result.driver.user.name || "Driver",
          score: Math.round(result.score),
          distance: result.proximity.toFixed(2),
          rating: result.driver.rating,
          wheelchairCapable: result.driver.wheelchairCapable,
          details: result.details,
        })),
      });
    }

    // Find best driver
    const bestMatch = findBestDriver(drivers as any, booking);

    if (!bestMatch) {
      return NextResponse.json(
        { error: "No suitable driver found" },
        { status: 404 }
      );
    }

    // Assign driver to booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        driverId: bestMatch.driver.id,
        status: "ASSIGNED",
      },
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

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      assignment: {
        driverId: bestMatch.driver.id,
        driverName: bestMatch.driver.user.name || "Driver",
        score: Math.round(bestMatch.score),
        distance: bestMatch.proximity.toFixed(2),
        reason: `Assigned based on proximity (${bestMatch.proximity.toFixed(
          1
        )}km) and rating (${bestMatch.driver.rating?.toFixed(1) || "N/A"})`,
      },
    });
  } catch (error) {
    console.error("Error auto-assigning driver:", error);
    return NextResponse.json(
      { error: "Failed to auto-assign driver" },
      { status: 500 }
    );
  }
}

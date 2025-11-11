import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// POST endpoint to recalculate all driver ratings
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all drivers
    const drivers = await prisma.driver.findMany({
      select: {
        id: true,
      },
    });

    let updated = 0;
    let errors = 0;

    for (const driver of drivers) {
      try {
        // Get all completed bookings for this driver
        const driverBookings = await prisma.booking.findMany({
          where: {
            driverId: driver.id,
            status: "COMPLETED",
          },
          select: {
            id: true,
          },
        });

        // Get all ratings for these bookings
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

        if (driverRatings.length > 0) {
          const avgRating =
            driverRatings.reduce((sum, r) => sum + r.driverRating, 0) /
            driverRatings.length;

          await prisma.driver.update({
            where: { id: driver.id },
            data: { rating: avgRating },
          });

          updated++;
          console.log(`Updated driver ${driver.id} rating to ${avgRating.toFixed(2)} based on ${driverRatings.length} ratings`);
        } else {
          // No ratings, set to null
          await prisma.driver.update({
            where: { id: driver.id },
            data: { rating: null },
          });
          updated++;
        }
      } catch (error) {
        console.error(`Error updating driver ${driver.id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      driversProcessed: drivers.length,
      updated,
      errors,
      message: `Recalculated ratings for ${updated} drivers${errors > 0 ? ` (${errors} errors)` : ""}`,
    });
  } catch (error) {
    console.error("Error recalculating driver ratings:", error);
    return NextResponse.json(
      { error: "Failed to recalculate ratings", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}


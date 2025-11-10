import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/drivers/payouts
 * Get payout history for the authenticated driver
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: userId },
      select: {
        commissionRate: true,
        totalEarnings: true,
        pendingPayout: true,
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // Get all completed bookings for this driver
    const completedBookings = await prisma.booking.findMany({
      where: {
        driverId: userId,
        status: "COMPLETED",
      },
      select: {
        id: true,
        pickupAddress: true,
        dropoffAddress: true,
        finalFareAmount: true,
        finalFareCurrency: true,
        createdAt: true,
        updatedAt: true,
        rider: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate payout details for each ride
    const payoutHistory = completedBookings.map((booking) => {
      const fareAmount = booking.finalFareAmount || 0;
      const commission = fareAmount * (driver.commissionRate || 0.15);
      const driverEarnings = fareAmount - commission;

      return {
        id: booking.id,
        rideId: booking.id,
        date: booking.updatedAt || booking.createdAt,
        riderName: booking.rider?.user?.name || "Unknown",
        pickup: booking.pickupAddress,
        dropoff: booking.dropoffAddress,
        grossFare: fareAmount,
        commission: commission,
        driverEarnings: driverEarnings,
        currency: booking.finalFareCurrency || "GBP",
        status: "PAID", // All completed rides are considered paid
      };
    });

    // Calculate summary statistics
    const totalEarnings = payoutHistory.reduce(
      (sum, payout) => sum + payout.driverEarnings,
      0
    );
    const totalCommission = payoutHistory.reduce(
      (sum, payout) => sum + payout.commission,
      0
    );
    const totalGross = payoutHistory.reduce(
      (sum, payout) => sum + payout.grossFare,
      0
    );

    // Group by week/month for summary
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const thisWeekEarnings = payoutHistory
      .filter((p) => new Date(p.date) >= thisWeek)
      .reduce((sum, p) => sum + p.driverEarnings, 0);

    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);
    const thisMonthEarnings = payoutHistory
      .filter((p) => new Date(p.date) >= thisMonth)
      .reduce((sum, p) => sum + p.driverEarnings, 0);

    return NextResponse.json({
      payoutHistory,
      summary: {
        totalEarnings,
        totalCommission,
        totalGross,
        thisWeekEarnings,
        thisMonthEarnings,
        totalRides: payoutHistory.length,
        commissionRate: driver.commissionRate || 0.15,
        pendingPayout: driver.pendingPayout || 0,
      },
    });
  } catch (error) {
    console.error("Failed to fetch payout history:", error);
    return NextResponse.json(
      { error: "Failed to fetch payout history" },
      { status: 500 }
    );
  }
}

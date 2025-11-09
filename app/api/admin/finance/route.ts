import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch completed bookings with fares
    const completedBookings = await prisma.booking.findMany({
      where: {
        status: "COMPLETED",
        finalFareAmount: { not: null },
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate revenue metrics
    const totalRevenue = completedBookings.reduce(
      (sum, booking) => sum + (booking.finalFareAmount || 0),
      0
    );

    const commissionRate = 0.15; // 15% default
    const totalCommission = totalRevenue * commissionRate;
    const totalDriverEarnings = totalRevenue - totalCommission;

    // Group by driver for payout calculations
    const driverPayouts = completedBookings.reduce((acc: any, booking) => {
      if (!booking.driverId) return acc;

      if (!acc[booking.driverId]) {
        acc[booking.driverId] = {
          driverId: booking.driverId,
          driverName: booking.driver?.user?.name || "Unknown",
          driverEmail: booking.driver?.user?.email || "",
          totalEarnings: 0,
          commission: 0,
          netPayout: 0,
          rideCount: 0,
          status: "PENDING",
        };
      }

      const fareAmount = booking.finalFareAmount || 0;
      const commission = fareAmount * commissionRate;
      const netPayout = fareAmount - commission;

      acc[booking.driverId].totalEarnings += fareAmount;
      acc[booking.driverId].commission += commission;
      acc[booking.driverId].netPayout += netPayout;
      acc[booking.driverId].rideCount += 1;

      return acc;
    }, {});

    const driverPayoutArray = Object.values(driverPayouts);

    // Recent transactions (last 10)
    const recentTransactions = completedBookings.slice(0, 10).map((booking) => ({
      id: booking.id,
      description: `Ride from ${booking.pickupAddress.split(",")[0]} to ${booking.dropoffAddress.split(",")[0]}`,
      amount: booking.finalFareAmount,
      createdAt: booking.createdAt,
      status: "Completed",
    }));

    // Count unique active drivers
    const activeDrivers = new Set(
      completedBookings.map((b) => b.driverId).filter(Boolean)
    ).size;

    return NextResponse.json({
      revenue: {
        total: totalRevenue,
        rideCount: completedBookings.length,
      },
      commission: {
        total: totalCommission,
        rate: commissionRate * 100,
      },
      driverEarnings: {
        total: totalDriverEarnings,
        count: activeDrivers,
      },
      pendingPayouts: {
        total: driverPayoutArray.reduce((sum: number, p: any) => sum + p.netPayout, 0),
        count: driverPayoutArray.length,
      },
      paymentMethods: {
        stripe: completedBookings.filter((b) => b.paymentIntentId).length,
        invoice: completedBookings.filter((b) => !b.paymentIntentId).length,
      },
      driverPayouts: driverPayoutArray,
      recentTransactions,
    });
  } catch (error) {
    console.error("Error fetching finance data:", error);
    return NextResponse.json(
      { error: "Failed to fetch finance data" },
      { status: 500 }
    );
  }
}

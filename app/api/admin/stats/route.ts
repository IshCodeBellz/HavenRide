import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get total users count
    const totalUsers = await prisma.user.count();

    // Get active drivers count (drivers currently online)
    const activeDrivers = await prisma.driver.count({
      where: { isOnline: true },
    });

    // Get today's completed rides
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRides = await prisma.booking.count({
      where: {
        status: "COMPLETED",
        updatedAt: {
          gte: today,
        },
      },
    });

    return NextResponse.json({
      totalUsers,
      activeDrivers,
      todayRides,
    });
  } catch (error: any) {
    console.error("Error fetching admin stats:", error);

    // Return default values if there's an error, so UI still works
    // This helps on Vercel where DB might have connection issues
    return NextResponse.json({
      totalUsers: 0,
      activeDrivers: 0,
      todayRides: 0,
      error: error.message || "Failed to fetch stats",
    });
  }
}

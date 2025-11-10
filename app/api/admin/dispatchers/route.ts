import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Fetch all dispatchers with user info
    const dispatchers = await prisma.dispatcher.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Calculate metrics for each dispatcher
    // Note: Since bookings don't track dispatcherId, we'll use default values
    // In a full implementation, you'd want to add dispatcherId to Booking model
    const dispatchersWithMetrics = await Promise.all(
      dispatchers.map(async (dispatcher) => {
        // Count bookings that were assigned (could be enhanced to track actual dispatcher)
        const assignedBookings = await prisma.booking.count({
          where: {
            status: { in: ["ASSIGNED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "COMPLETED"] },
            createdAt: {
              gte: dispatcher.createdAt, // Rough estimate
            },
          },
        });

        return {
          id: dispatcher.id,
          user: dispatcher.user,
          region: dispatcher.region || null,
          shift: dispatcher.shift || null,
          ridesDispatched: assignedBookings, // Approximate count
          avgResponseTime: null, // Would need tracking system
          status: dispatcher.isActive ? "ACTIVE" : "INACTIVE",
          lastActiveAt: dispatcher.updatedAt,
        };
      })
    );

    return NextResponse.json({ dispatchers: dispatchersWithMetrics });
  } catch (error) {
    console.error("Failed to fetch dispatchers:", error);
    return NextResponse.json(
      { error: "Failed to fetch dispatchers" },
      { status: 500 }
    );
  }
}

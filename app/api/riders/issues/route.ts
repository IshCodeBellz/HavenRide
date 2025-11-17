import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// POST create a new issue report
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, subject, description, bookingId, priority } = body;

    if (!type || !subject || !description) {
      return NextResponse.json(
        { error: "type, subject, and description are required" },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ["LOST_ITEM", "RIDE_ISSUE", "PAYMENT_ISSUE", "SAFETY", "OTHER"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // If bookingId provided, verify it belongs to the rider
    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking || booking.riderId !== userId) {
        return NextResponse.json(
          { error: "Booking not found or unauthorized" },
          { status: 404 }
        );
      }
    }

    const issue = await prisma.issueReport.create({
      data: {
        riderId: userId,
        type,
        subject,
        description,
        bookingId: bookingId || null,
        priority: priority || "MEDIUM",
        status: "OPEN",
      },
    });

    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    console.error("Error creating issue report:", error);
    return NextResponse.json(
      { error: "Failed to create issue report" },
      { status: 500 }
    );
  }
}

// GET all issue reports for the authenticated rider
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const issues = await prisma.issueReport.findMany({
      where: { riderId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        booking: {
          select: {
            id: true,
            pickupAddress: true,
            dropoffAddress: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json(issues);
  } catch (error) {
    console.error("Error fetching issue reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch issue reports" },
      { status: 500 }
    );
  }
}





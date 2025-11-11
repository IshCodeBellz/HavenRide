import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/support/tickets
 * Get all support tickets for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Failed to fetch support tickets:", error);
    return NextResponse.json(
      { error: "Failed to fetch support tickets" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/support/tickets
 * Create a new support ticket
 * Accepts: { subject, description, category, priority?, bookingId? }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { subject, description, category, priority, bookingId } = body;

    if (!subject || !description) {
      return NextResponse.json(
        { error: "subject and description are required" },
        { status: 400 }
      );
    }

    // Validate category if provided
    const validCategories = [
      "PAYMENT",
      "RIDE_ISSUE",
      "TECHNICAL",
      "ACCOUNT",
      "VEHICLE",
      "SAFETY",
      "OTHER",
    ];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate priority if provided
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${validPriorities.join(", ")}` },
        { status: 400 }
      );
    }

    // Create support ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject,
        description,
        category: category || "OTHER",
        priority: priority || "MEDIUM",
        status: "OPEN",
        bookingId: bookingId || null,
      },
      include: {
        user: {
          select: {
          name: true,
          email: true,
        },
      },
    },
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error("Failed to create support ticket:", error);
    return NextResponse.json(
      { error: "Failed to create support ticket" },
      { status: 500 }
    );
  }
}



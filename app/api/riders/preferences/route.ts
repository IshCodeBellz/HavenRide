import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET rider preferences
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rider = await prisma.rider.findUnique({
      where: { id: userId },
      select: {
        alwaysRequestWheelchair: true,
        needsAssistance: true,
        phone: true,
      },
    });

    if (!rider) {
      return NextResponse.json({
        alwaysRequestWheelchair: false,
        needsAssistance: false,
        phone: null,
      });
    }

    return NextResponse.json(rider);
  } catch (error) {
    console.error("Error fetching rider preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

// PUT update rider preferences
export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { alwaysRequestWheelchair, needsAssistance, phone } = body;

    // Ensure User exists in database first
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress || "";

    if (userEmail) {
      await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          email: userEmail,
          name: clerkUser.firstName && clerkUser.lastName
            ? `${clerkUser.firstName} ${clerkUser.lastName}`
            : clerkUser.username || null,
        },
      });
    }

    const rider = await prisma.rider.upsert({
      where: { id: userId },
      update: {
        alwaysRequestWheelchair: alwaysRequestWheelchair !== undefined ? alwaysRequestWheelchair : undefined,
        needsAssistance: needsAssistance !== undefined ? needsAssistance : undefined,
        phone: phone !== undefined ? phone : undefined,
      },
      create: {
        id: userId,
        alwaysRequestWheelchair: alwaysRequestWheelchair || false,
        needsAssistance: needsAssistance || false,
        phone: phone || null,
      },
    });

    return NextResponse.json(rider);
  } catch (error) {
    console.error("Error updating rider preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

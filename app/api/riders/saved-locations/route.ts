import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET all saved locations for a rider
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const locations = await prisma.savedLocation.findMany({
      where: { riderId: userId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching saved locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved locations" },
      { status: 500 }
    );
  }
}

// POST create a new saved location
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { label, address, latitude, longitude } = body;

    console.log("Creating location with:", { userId, label, address, latitude, longitude });

    if (!label || !address || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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

    // Ensure rider exists
    await prisma.rider.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
      },
    });

    const location = await prisma.savedLocation.create({
      data: {
        riderId: userId,
        label,
        address,
        latitude,
        longitude,
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error("Error creating saved location:", error);
    return NextResponse.json(
      { error: "Failed to create saved location", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

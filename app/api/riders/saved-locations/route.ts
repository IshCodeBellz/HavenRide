import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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

    // Check if User exists first
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.error("User not found:", userId);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Ensure rider exists
    const rider = await prisma.rider.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
      },
    });

    const location = await prisma.savedLocation.create({
      data: {
        riderId: rider.id,
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

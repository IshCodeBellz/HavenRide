import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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

    const rider = await prisma.rider.upsert({
      where: { id: userId },
      update: {
        alwaysRequestWheelchair,
        needsAssistance,
        phone,
      },
      create: {
        id: userId,
        user: {
          connect: { id: userId },
        },
        alwaysRequestWheelchair: alwaysRequestWheelchair || false,
        needsAssistance: needsAssistance || false,
        phone: phone || null,
      },
    });

    return NextResponse.json(rider);
  } catch (error) {
    console.error("Error updating rider preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}

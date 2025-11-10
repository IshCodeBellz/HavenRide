import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET driver profile data
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const driver = await prisma.driver.findUnique({
      where: { id: userId },
      select: {
        vehicleMake: true,
        vehicleModel: true,
        vehiclePlate: true,
        wheelchairCapable: true,
        phone: true,
        verificationStatus: true,
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json(driver);
  } catch (error) {
    console.error("Error fetching driver profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch driver profile" },
      { status: 500 }
    );
  }
}

// PUT update driver profile
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { vehicleMake, vehicleModel, vehiclePlate, wheelchairCapable, phone } = body;

    // Ensure driver exists
    await prisma.driver.upsert({
      where: { id: userId },
      update: {
        vehicleMake: vehicleMake || null,
        vehicleModel: vehicleModel || null,
        vehiclePlate: vehiclePlate || null,
        wheelchairCapable: wheelchairCapable || false,
        phone: phone || null,
      },
      create: {
        id: userId,
        vehicleMake: vehicleMake || null,
        vehicleModel: vehicleModel || null,
        vehiclePlate: vehiclePlate || null,
        wheelchairCapable: wheelchairCapable || false,
        phone: phone || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating driver profile:", error);
    return NextResponse.json(
      { error: "Failed to update driver profile", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}


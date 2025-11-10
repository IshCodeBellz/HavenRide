import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const driverId = id;

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        lastLat: true,
        lastLng: true,
        isOnline: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: driver.id,
      name: driver.user.name,
      lastLat: driver.lastLat,
      lastLng: driver.lastLng,
      isOnline: driver.isOnline,
    });
  } catch (error) {
    console.error("Error fetching driver location:", error);
    return NextResponse.json(
      { error: "Failed to fetch driver location" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// PUT update a saved location
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { label, address, latitude, longitude } = body;

    // Verify ownership
    const existingLocation = await prisma.savedLocation.findUnique({
      where: { id },
    });

    if (!existingLocation || existingLocation.riderId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.savedLocation.update({
      where: { id },
      data: {
        label,
        address,
        latitude,
        longitude,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating saved location:", error);
    return NextResponse.json(
      { error: "Failed to update saved location" },
      { status: 500 }
    );
  }
}

// DELETE remove a saved location
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existingLocation = await prisma.savedLocation.findUnique({
      where: { id },
    });

    if (!existingLocation || existingLocation.riderId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.savedLocation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting saved location:", error);
    return NextResponse.json(
      { error: "Failed to delete saved location" },
      { status: 500 }
    );
  }
}

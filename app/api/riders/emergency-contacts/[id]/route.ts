import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// PUT update an emergency contact
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, phone, relationship, isPrimary } = body;

    // Verify ownership
    const existing = await prisma.emergencyContact.findUnique({
      where: { id },
    });

    if (!existing || existing.riderId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // If setting as primary, unset other primary contacts
    if (isPrimary) {
      await prisma.emergencyContact.updateMany({
        where: { riderId: userId, isPrimary: true, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.emergencyContact.update({
      where: { id },
      data: {
        name: name || existing.name,
        phone: phone || existing.phone,
        relationship: relationship !== undefined ? relationship : existing.relationship,
        isPrimary: isPrimary !== undefined ? isPrimary : existing.isPrimary,
      },
    });

    return NextResponse.json(contact);
  } catch (error) {
    console.error("Error updating emergency contact:", error);
    return NextResponse.json(
      { error: "Failed to update emergency contact" },
      { status: 500 }
    );
  }
}

// DELETE an emergency contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await prisma.emergencyContact.findUnique({
      where: { id },
    });

    if (!existing || existing.riderId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.emergencyContact.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting emergency contact:", error);
    return NextResponse.json(
      { error: "Failed to delete emergency contact" },
      { status: 500 }
    );
  }
}



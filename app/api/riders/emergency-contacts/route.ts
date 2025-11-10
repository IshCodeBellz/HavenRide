import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET all emergency contacts for the authenticated rider
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contacts = await prisma.emergencyContact.findMany({
      where: { riderId: userId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Error fetching emergency contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch emergency contacts" },
      { status: 500 }
    );
  }
}

// POST create a new emergency contact
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, relationship, isPrimary } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    // Ensure User exists in database first
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

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

    // Ensure Rider exists
    await prisma.rider.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
      },
    });

    // If setting as primary, unset other primary contacts
    if (isPrimary) {
      await prisma.emergencyContact.updateMany({
        where: { riderId: userId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.emergencyContact.create({
      data: {
        riderId: userId,
        name,
        phone,
        relationship: relationship || null,
        isPrimary: isPrimary || false,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Error creating emergency contact:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorDetails = error instanceof Error && 'code' in error ? String(error.code) : undefined;
    return NextResponse.json(
      { 
        error: "Failed to create emergency contact", 
        details: errorMessage,
        code: errorDetails
      },
      { status: 500 }
    );
  }
}


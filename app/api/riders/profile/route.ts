import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET user profile
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    
    const rider = await prisma.rider.findUnique({
      where: { id: userId },
      select: {
        phone: true,
      },
    });

    return NextResponse.json({
      name: clerkUser.firstName && clerkUser.lastName 
        ? `${clerkUser.firstName} ${clerkUser.lastName}`
        : clerkUser.username || "User",
      email: clerkUser.emailAddresses[0]?.emailAddress || "",
      phone: rider?.phone || "",
      imageUrl: clerkUser.imageUrl,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PUT update user profile
export async function PUT(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone } = body;

    // Update phone in database
    if (phone !== undefined) {
      await prisma.rider.upsert({
        where: { id: userId },
        update: { phone },
        create: {
          id: userId,
          user: {
            connect: { id: userId },
          },
          phone,
        },
      });
    }

    // Update name in Clerk
    if (name) {
      const client = await clerkClient();
      const nameParts = name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      
      await client.users.updateUser(userId, {
        firstName,
        lastName,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

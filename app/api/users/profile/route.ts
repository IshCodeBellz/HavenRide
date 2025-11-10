import { NextRequest, NextResponse } from "next/server";
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
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        imageUrl: true,
      },
    });

    return NextResponse.json({
      name: user?.name || (clerkUser.firstName && clerkUser.lastName 
        ? `${clerkUser.firstName} ${clerkUser.lastName}`
        : clerkUser.username || "User"),
      email: user?.email || clerkUser.emailAddresses[0]?.emailAddress || "",
      imageUrl: user?.imageUrl || clerkUser.imageUrl || null,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

// PUT update user profile
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email } = body;

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress || "";

    // Ensure User exists in database first
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

    // Update name in Clerk and database
    if (name) {
      const nameParts = name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      
      await client.users.updateUser(userId, {
        firstName,
        lastName,
      });

      // Also update name in database
      await prisma.user.update({
        where: { id: userId },
        data: { name },
      });
    }

    // Note: Email updates in Clerk require verification, so we don't update it here
    // The email field in the UI is for display purposes only

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}


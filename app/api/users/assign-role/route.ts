import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role } = await req.json();
    if (!role || !["RIDER", "DRIVER", "DISPATCHER", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Security: Prevent self-assignment of privileged roles
    if (["ADMIN", "DISPATCHER"].includes(role)) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      // Only existing admins can assign admin/dispatcher roles
      if (currentUser?.role !== "ADMIN") {
        return NextResponse.json(
          {
            error:
              "Unauthorized: Only admins can assign ADMIN or DISPATCHER roles",
          },
          { status: 403 }
        );
      }
    }

    // Get user email from Clerk
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Update or create user in database
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: { role },
      create: {
        id: userId,
        email: email,
        name: clerkUser.firstName
          ? `${clerkUser.firstName} ${clerkUser.lastName || ""}`.trim()
          : email,
        role,
      },
    });

    // Update Clerk metadata
    try {
      await client.users.updateUser(userId, {
        publicMetadata: { role },
      });
    } catch (e) {
      console.error("Failed to update Clerk metadata:", e);
    }

    // Create role-specific records if needed
    if (role === "RIDER") {
      await prisma.rider.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId },
      });
    } else if (role === "DRIVER") {
      await prisma.driver.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, isOnline: false },
      });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Error assigning role:", error);
    return NextResponse.json(
      { error: "Failed to assign role" },
      { status: 500 }
    );
  }
}

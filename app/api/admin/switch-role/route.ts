import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!currentUser?.isAdmin) {
      return NextResponse.json(
        { error: "Only admins can switch roles" },
        { status: 403 }
      );
    }

    const { role } = await req.json();
    if (!role || !["RIDER", "DRIVER", "DISPATCHER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Update user role in database
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    // Update Clerk metadata
    try {
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        publicMetadata: { role },
      });
    } catch (e) {
      console.error("Failed to update Clerk metadata:", e);
    }

    // Ensure role-specific records exist
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

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error("Error switching role:", error);
    return NextResponse.json(
      { error: "Failed to switch role" },
      { status: 500 }
    );
  }
}

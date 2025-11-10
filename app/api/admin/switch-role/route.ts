import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is admin - use raw query to check isAdmin field
    // (Prisma client may not have isAdmin in types yet)
    const currentUser: any = await prisma.$queryRaw`
      SELECT role, "isAdmin" FROM "User" WHERE id = ${userId}
    `;

    const userData = currentUser[0];

    // Admin status is preserved via isAdmin field, allowing role switching freedom
    if (!userData?.isAdmin && userData?.role !== "ADMIN") {
      console.error("Role switch denied:", {
        userId,
        currentRole: userData?.role,
        isAdmin: userData?.isAdmin,
      });
      return NextResponse.json(
        { error: "Only admins can switch roles" },
        { status: 403 }
      );
    }

    const { role } = await req.json();
    if (!role || !["RIDER", "DRIVER", "DISPATCHER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Update user role in database (preserve isAdmin status)
    console.log("Updating role for user:", {
      userId,
      oldRole: userData.role,
      newRole: role,
      isAdmin: userData.isAdmin,
    });

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    console.log("Database role updated successfully");

    // Update Clerk metadata
    try {
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        publicMetadata: { role },
      });
      console.log("Clerk metadata updated successfully");
    } catch (e) {
      console.error("Failed to update Clerk metadata:", e);
      // Continue even if Clerk update fails - database is source of truth
    }

    // Ensure role-specific records exist
    if (role === "RIDER") {
      await prisma.rider.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId },
      });
      console.log("Rider record ensured");
    } else if (role === "DRIVER") {
      await prisma.driver.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, isOnline: false },
      });
      console.log("Driver record ensured");
    }

    console.log("Role switch completed successfully:", { userId, role });
    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error("Error switching role:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to switch role", details: errorMessage },
      { status: 500 }
    );
  }
}

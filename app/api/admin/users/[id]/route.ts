import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// PATCH - Edit user details
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!adminUser?.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const { name, email, role, status } = body;

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Failed to update user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE - Delete user
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!adminUser?.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    // Prevent deleting yourself
    if (id === userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check if user has dependent records
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        driver: { include: { bookings: true } },
        rider: { include: { bookings: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If user has completed bookings, soft delete by setting status to DEACTIVATED
    const hasBookings =
      (user.driver?.bookings && user.driver.bookings.length > 0) ||
      (user.rider?.bookings && user.rider.bookings.length > 0);

    if (hasBookings) {
      await prisma.user.update({
        where: { id },
        data: { status: "DEACTIVATED" },
      });
      return NextResponse.json({
        success: true,
        message: "User deactivated (has booking history)",
      });
    }

    // Hard delete if no bookings
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "User permanently deleted",
    });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

// PUT - Suspend/Activate user
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!adminUser?.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const { action } = body; // "suspend" or "activate"

    if (!action || !["suspend", "activate"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'suspend' or 'activate'" },
        { status: 400 }
      );
    }

    // Prevent suspending yourself
    if (id === userId) {
      return NextResponse.json(
        { error: "Cannot suspend your own account" },
        { status: 400 }
      );
    }

    const newStatus = action === "suspend" ? "SUSPENDED" : "ACTIVE";

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
    });

    return NextResponse.json({
      success: true,
      message: `User ${action}d successfully`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Failed to update user status:", error);
    return NextResponse.json(
      { error: "Failed to update user status" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, message, targetRole } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    // Create system notification
    const notification = await prisma.systemNotification.create({
      data: {
        createdById: userId,
        title,
        message,
        targetRole: targetRole === "ALL" ? null : targetRole,
        isActive: true,
      },
    });

    // Optionally integrate with Ably for real-time broadcast
    try {
      const { publish } = await import("@/lib/realtime/publish");
      await publish("notifications", "system_broadcast", {
        id: notification.id,
        title,
        message,
        targetRole: targetRole || "ALL",
        createdAt: notification.createdAt,
      });
    } catch (error) {
      console.error("Failed to publish notification via Ably:", error);
      // Continue even if Ably fails - notification is saved to DB
    }

    return NextResponse.json({
      success: true,
      message: "Notification broadcast successfully",
    });
  } catch (error) {
    console.error("Failed to broadcast notification:", error);
    return NextResponse.json(
      { error: "Failed to broadcast notification" },
      { status: 500 }
    );
  }
}

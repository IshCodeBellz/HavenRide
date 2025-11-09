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

    // TODO: Once SystemNotification model is migrated, use:
    // const notification = await prisma.systemNotification.create({
    //   data: {
    //     title,
    //     message,
    //     type: "BROADCAST",
    //     targetRole: targetRole || "ALL",
    //     isRead: false,
    //   },
    // });

    // Optionally integrate with Ably for real-time broadcast
    // const { publishNotification } = await import("@/lib/realtime/publish");
    // await publishNotification({
    //   type: "SYSTEM_BROADCAST",
    //   title,
    //   message,
    //   targetRole,
    // });

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

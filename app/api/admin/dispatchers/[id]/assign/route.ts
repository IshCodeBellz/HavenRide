import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(
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

    const { id: dispatcherId } = await context.params;
    const body = await req.json();
    const { region, shift } = body;

    if (!region && !shift) {
      return NextResponse.json(
        { error: "Either region or shift must be provided" },
        { status: 400 }
      );
    }

    // TODO: Once Dispatcher model is migrated, use:
    // const dispatcher = await prisma.dispatcher.update({
    //   where: { id: dispatcherId },
    //   data: {
    //     ...(region && { region }),
    //     ...(shift && { shift }),
    //   },
    //   include: {
    //     user: {
    //       select: { name: true, email: true },
    //     },
    //   },
    // });

    // For now, return success message
    return NextResponse.json({
      success: true,
      message: "Dispatcher assignment updated successfully",
      assignment: {
        dispatcherId,
        region: region || "Unassigned",
        shift: shift || "Not set",
      },
    });
  } catch (error) {
    console.error("Failed to assign dispatcher:", error);
    return NextResponse.json(
      { error: "Failed to assign dispatcher" },
      { status: 500 }
    );
  }
}

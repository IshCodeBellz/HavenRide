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

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: driverId } = await context.params;

    // Update driver verification status
    await prisma.driver.update({
      where: { id: driverId },
      data: { docsVerified: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error approving driver:", error);
    return NextResponse.json(
      { error: "Failed to approve driver" },
      { status: 500 }
    );
  }
}

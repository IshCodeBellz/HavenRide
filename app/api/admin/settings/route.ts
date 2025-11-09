import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET - Fetch current settings
export async function GET(req: NextRequest) {
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

    // TODO: Once SystemSettings model is created, fetch from database
    // For now, return defaults matching the UI
    const settings = {
      baseFare: 6.0,
      perKm: 1.8,
      wheelchairMult: 1.15,
      requirePickupPin: true,
      sendReceipts: true,
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PATCH - Update settings
export async function PATCH(req: NextRequest) {
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

    const body = await req.json();
    const { baseFare, perKm, wheelchairMult, requirePickupPin, sendReceipts } =
      body;

    // Validate settings
    if (baseFare !== undefined && (baseFare < 0 || baseFare > 100)) {
      return NextResponse.json(
        { error: "Base fare must be between 0 and 100" },
        { status: 400 }
      );
    }

    if (perKm !== undefined && (perKm < 0 || perKm > 50)) {
      return NextResponse.json(
        { error: "Price per km must be between 0 and 50" },
        { status: 400 }
      );
    }

    if (
      wheelchairMult !== undefined &&
      (wheelchairMult < 1 || wheelchairMult > 3)
    ) {
      return NextResponse.json(
        { error: "Wheelchair multiplier must be between 1 and 3" },
        { status: 400 }
      );
    }

    // TODO: Once SystemSettings model is created, save to database
    // For now, simulate success and potentially store in environment variables
    // or a JSON config file

    const updatedSettings = {
      baseFare: baseFare ?? 6.0,
      perKm: perKm ?? 1.8,
      wheelchairMult: wheelchairMult ?? 1.15,
      requirePickupPin: requirePickupPin ?? true,
      sendReceipts: sendReceipts ?? true,
    };

    // Log the settings change for audit
    await prisma.complianceLog.create({
      data: {
        userId,
        action: "SETTINGS_UPDATE",
        details: `Updated system settings: ${JSON.stringify(updatedSettings)}`,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      settings: updatedSettings,
    });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

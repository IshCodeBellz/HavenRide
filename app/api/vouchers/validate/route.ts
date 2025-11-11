import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// POST validate a voucher code
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, fareAmount } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Voucher code is required" },
        { status: 400 }
      );
    }

    // Find voucher
    const voucher = await prisma.voucherCode.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!voucher) {
      return NextResponse.json(
        { error: "Invalid voucher code" },
        { status: 404 }
      );
    }

    // Check if active
    if (!voucher.isActive) {
      return NextResponse.json(
        { error: "Voucher code is not active" },
        { status: 400 }
      );
    }

    // Check validity dates
    const now = new Date();
    if (now < voucher.validFrom || now > voucher.validUntil) {
      return NextResponse.json(
        { error: "Voucher code has expired or is not yet valid" },
        { status: 400 }
      );
    }

    // Check usage limits
    if (voucher.maxUses && voucher.currentUses >= voucher.maxUses) {
      return NextResponse.json(
        { error: "Voucher code has reached maximum uses" },
        { status: 400 }
      );
    }

    // Check rider restriction
    if (voucher.riderId && voucher.riderId !== userId) {
      return NextResponse.json(
        { error: "Voucher code is not valid for your account" },
        { status: 403 }
      );
    }

    // Check minimum fare amount
    if (voucher.minFareAmount && fareAmount && fareAmount < voucher.minFareAmount) {
      return NextResponse.json(
        { error: `Minimum fare amount of £${voucher.minFareAmount} required` },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (voucher.amount) {
      // Fixed amount discount
      discountAmount = Math.min(voucher.amount, fareAmount || Infinity);
    } else if (voucher.percentage) {
      // Percentage discount
      const percentageDiscount = ((fareAmount || 0) * voucher.percentage) / 100;
      discountAmount = percentageDiscount;
      if (voucher.maxDiscount) {
        discountAmount = Math.min(discountAmount, voucher.maxDiscount);
      }
    }

    return NextResponse.json({
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        description: voucher.description,
      },
      discountAmount: Math.round(discountAmount * 100) / 100, // Round to 2 decimal places
    });
  } catch (error) {
    console.error("Error validating voucher:", error);
    return NextResponse.json(
      { error: "Failed to validate voucher code" },
      { status: 500 }
    );
  }
}



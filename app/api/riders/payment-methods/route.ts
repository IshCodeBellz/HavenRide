import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET all payment methods for a rider
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const methods = await prisma.paymentMethod.findMany({
      where: { riderId: userId },
      orderBy: { isDefault: "desc" },
    });

    return NextResponse.json(methods);
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 }
    );
  }
}

// POST create a new payment method
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { stripePaymentMethodId, last4, brand, expiryMonth, expiryYear, isDefault } = body;

    if (!stripePaymentMethodId || !last4 || !brand || !expiryMonth || !expiryYear) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure rider exists
    const rider = await prisma.rider.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        user: {
          connect: { id: userId },
        },
      },
    });

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { riderId: rider.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        riderId: rider.id,
        stripePaymentMethodId,
        last4,
        brand,
        expiryMonth,
        expiryYear,
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json(paymentMethod, { status: 201 });
  } catch (error) {
    console.error("Error creating payment method:", error);
    return NextResponse.json(
      { error: "Failed to create payment method" },
      { status: 500 }
    );
  }
}

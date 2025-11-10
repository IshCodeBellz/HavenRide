import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET rider's Stripe customer ID
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rider = await prisma.rider.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    return NextResponse.json({ 
      stripeCustomerId: rider?.stripeCustomerId || null 
    });
  } catch (error) {
    console.error("Error fetching Stripe customer ID:", error);
    return NextResponse.json(
      { error: "Failed to fetch Stripe customer ID" },
      { status: 500 }
    );
  }
}


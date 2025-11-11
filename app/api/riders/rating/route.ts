import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET rider average rating
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all ride ratings for this rider
    const ratings = await prisma.rideRating.findMany({
      where: {
        riderId: userId,
      },
      select: {
        rideRating: true,
      },
    });

    if (ratings.length === 0) {
      return NextResponse.json({ rating: null, count: 0 });
    }

    // Calculate average ride rating
    const avgRating =
      ratings.reduce((sum, r) => sum + r.rideRating, 0) / ratings.length;

    return NextResponse.json({
      rating: avgRating,
      count: ratings.length,
    });
  } catch (error) {
    console.error("Error fetching rider rating:", error);
    return NextResponse.json(
      { error: "Failed to fetch rider rating" },
      { status: 500 }
    );
  }
}


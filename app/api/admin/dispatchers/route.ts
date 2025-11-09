import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
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
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // TODO: Once Dispatcher model is migrated, use:
    // const dispatchers = await prisma.dispatcher.findMany({
    //   include: {
    //     user: {
    //       select: {
    //         name: true,
    //         email: true,
    //       },
    //     },
    //   },
    //   orderBy: { ridesDispatched: "desc" },
    // });

    // Temporary: Return mock data structure
    const dispatchers: any[] = [];

    return NextResponse.json({ dispatchers });
  } catch (error) {
    console.error("Failed to fetch dispatchers:", error);
    return NextResponse.json(
      { error: "Failed to fetch dispatchers" },
      { status: 500 }
    );
  }
}

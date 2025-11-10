import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ role: null, isAdmin: false });

  try {
    // Use raw query to ensure we get isAdmin field
    const result: any = await prisma.$queryRaw`
      SELECT role, "isAdmin" FROM "User" WHERE id = ${userId}
    `;

    const db = result[0];

    const client = await clerkClient();
    const u = await client.users.getUser(userId);
    
    // Get user profile data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        imageUrl: true,
      },
    });

    const role = db?.role || (u.publicMetadata as any)?.role || null;
    const isAdmin = db?.isAdmin || false;

    return NextResponse.json({
      role,
      isAdmin,
      name: user?.name || (u.firstName && u.lastName 
        ? `${u.firstName} ${u.lastName}`
        : u.username || "User"),
      email: user?.email || u.emailAddresses[0]?.emailAddress || "",
      imageUrl: user?.imageUrl || u.imageUrl || null,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json({ role: null, isAdmin: false });
  }
}

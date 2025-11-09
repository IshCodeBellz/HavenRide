import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ role: null, isAdmin: false });

  const db = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (db?.role) {
    // User is admin if their role is 'ADMIN'
    const isAdmin = db.role === "ADMIN";
    console.log("User role check:", { userId, role: db.role, isAdmin });
    return NextResponse.json({
      role: db.role,
      isAdmin,
    });
  }

  try {
    const client = await clerkClient();
    const u = await client.users.getUser(userId);
    const metaRole = (u.publicMetadata as any)?.role || null;
    const isAdmin = metaRole === "ADMIN";
    console.log("User role from Clerk metadata:", { userId, role: metaRole, isAdmin });
    return NextResponse.json({ role: metaRole, isAdmin });
  } catch (error) {
    console.error("Error fetching user from Clerk:", error);
    return NextResponse.json({ role: null, isAdmin: false });
  }
}

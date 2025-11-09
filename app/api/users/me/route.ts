import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ role: null, isAdmin: false });

  // Use raw query to ensure we get isAdmin field
  const result: any = await prisma.$queryRaw`
    SELECT role, "isAdmin" FROM "User" WHERE id = ${userId}
  `;
  
  const db = result[0];

  if (db?.role) {
    return NextResponse.json({
      role: db.role,
      isAdmin: db.isAdmin || false,
    });
  }

  try {
    const client = await clerkClient();
    const u = await client.users.getUser(userId);
    const metaRole = (u.publicMetadata as any)?.role || null;
    return NextResponse.json({ role: metaRole, isAdmin: false });
  } catch {
    return NextResponse.json({ role: null, isAdmin: false });
  }
}

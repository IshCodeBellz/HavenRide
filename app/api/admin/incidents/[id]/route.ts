import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET - Fetch single incident
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await context.params;

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            rider: {
              include: {
                user: {
                  select: { name: true, email: true },
                },
              },
            },
            driver: {
              include: {
                user: {
                  select: { name: true, email: true },
                },
              },
            },
          },
        },
        reportedBy: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    return NextResponse.json({ incident });
  } catch (error) {
    console.error("Failed to fetch incident:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident" },
      { status: 500 }
    );
  }
}

// PATCH - Update incident
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const { status, priority, assignedTo, resolution } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;
    if (resolution !== undefined) {
      updateData.resolution = resolution;
      if (resolution && status === "RESOLVED") {
        updateData.resolvedAt = new Date();
      }
    }

    const incident = await prisma.incident.update({
      where: { id },
      data: updateData,
      include: {
        booking: {
          include: {
            rider: {
              include: {
                user: {
                  select: { name: true, email: true },
                },
              },
            },
            driver: {
              include: {
                user: {
                  select: { name: true, email: true },
                },
              },
            },
          },
        },
        reportedBy: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Incident updated successfully",
      incident,
    });
  } catch (error) {
    console.error("Failed to update incident:", error);
    return NextResponse.json(
      { error: "Failed to update incident" },
      { status: 500 }
    );
  }
}


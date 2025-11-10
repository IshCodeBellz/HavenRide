import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/realtime/publish";

/**
 * POST /api/dispatcher/incidents/[id]/escalate
 * Escalate incident to admin (dispatcher only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify dispatcher role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== "DISPATCHER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { adminId, notes } = body;

    // Find an admin to assign to (if not specified, find first admin)
    let assigneeId = adminId;
    if (!assigneeId) {
      const admin = await prisma.user.findFirst({
        where: {
          role: "ADMIN",
          isAdmin: true,
        },
        select: { id: true },
      });
      if (admin) {
        assigneeId = admin.id;
      }
    }

    const updateData: any = {
      status: "ESCALATED",
      priority: "CRITICAL", // Auto-upgrade to critical when escalated
    };

    if (assigneeId) {
      updateData.assigneeId = assigneeId;
    }

    if (notes) {
      updateData.resolution = notes;
    }

    const incident = await prisma.incident.update({
      where: { id },
      data: updateData,
      include: {
        booking: {
          include: {
            rider: {
              include: {
                user: true,
              },
            },
            driver: {
              include: {
                user: true,
              },
            },
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Publish real-time alert to admins
    await publish("admin", "incident_escalated", {
      id: incident.id,
      type: incident.type,
      priority: incident.priority,
      title: incident.title,
      assigneeId: assigneeId,
    });

    // Also publish to dispatch channel
    await publish("dispatch", "incident_escalated", {
      id: incident.id,
      status: incident.status,
    });

    return NextResponse.json({
      success: true,
      incident,
      message: assigneeId
        ? "Incident escalated to admin"
        : "Incident escalated (no admin assigned)",
    });
  } catch (error) {
    console.error("Error escalating incident:", error);
    return NextResponse.json(
      { error: "Failed to escalate incident" },
      { status: 500 }
    );
  }
}


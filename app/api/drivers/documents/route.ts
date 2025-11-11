import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/drivers/documents
 * Get all documents for the authenticated driver
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify driver role
    const driver = await prisma.driver.findUnique({
      where: { id: userId },
    });

    if (!driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    const documents = await prisma.driverDocument.findMany({
      where: { driverId: userId },
      orderBy: { uploadedAt: "desc" },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Failed to fetch driver documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/drivers/documents
 * Upload a new document for the authenticated driver
 * Accepts: { documentType, documentUrl, expiryDate? }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { documentType, documentUrl, expiryDate } = body;

    if (!documentType || !documentUrl) {
      return NextResponse.json(
        { error: "documentType and documentUrl are required" },
        { status: 400 }
      );
    }

    // Validate document type
    const validTypes = [
      "LICENSE",
      "INSURANCE",
      "DBS",
      "TRAINING",
      "VEHICLE_REGISTRATION",
    ];
    if (!validTypes.includes(documentType)) {
      return NextResponse.json(
        { error: `Invalid documentType. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: userId },
    });

    if (!driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    // Create document record
    const document = await prisma.driverDocument.create({
      data: {
        driverId: userId,
        documentType,
        documentUrl,
        status: "PENDING",
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    console.error("Failed to upload document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}



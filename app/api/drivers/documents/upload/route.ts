import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/prisma";

// POST upload document file
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: userId },
    });

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const documentType = formData.get("documentType") as string;
    const expiryDate = formData.get("expiryDate") as string | null;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (!documentType) {
      return NextResponse.json(
        { error: "Document type is required" },
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
        {
          error: `Invalid documentType. Must be one of: ${validTypes.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // Validate file type (PDF, images)
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File must be a PDF or image (JPEG, PNG, WebP)" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(
      process.cwd(),
      "public",
      "uploads",
      "documents",
      userId
    );
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const fileExtension = file.name.split(".").pop();
    const fileName = `${documentType}-${Date.now()}.${fileExtension}`;
    const filePath = join(uploadsDir, fileName);

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Generate URL
    const documentUrl = `/uploads/documents/${userId}/${fileName}`;

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

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      {
        error: "Failed to upload document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

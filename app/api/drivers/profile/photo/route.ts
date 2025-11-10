import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// PUT update driver profile photo
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format (allow relative URLs for localhost)
    let isValidUrl = false;
    try {
      new URL(imageUrl);
      isValidUrl = true;
    } catch {
      // If it's a relative URL (starts with /), that's also valid
      if (imageUrl.startsWith('/')) {
        isValidUrl = true;
      }
    }
    
    if (!isValidUrl) {
      return NextResponse.json(
        { error: "Invalid image URL format" },
        { status: 400 }
      );
    }

    // Store image URL in our database
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Ensure User exists
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: userEmail,
        name: clerkUser.firstName && clerkUser.lastName
          ? `${clerkUser.firstName} ${clerkUser.lastName}`
          : clerkUser.username || null,
      },
    });

    // Update the imageUrl
    await prisma.user.update({
      where: { id: userId },
      data: { imageUrl: imageUrl },
    });

    console.log("Image URL saved to database:", imageUrl);

    // Try to update Clerk (may fail for localhost URLs, but that's okay)
    try {
      await client.users.updateUser(userId, {
        imageUrl: imageUrl.startsWith('/') ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${imageUrl}` : imageUrl,
      });
      console.log("Clerk image URL updated");
    } catch (clerkError) {
      console.warn("Failed to update Clerk image URL (this is okay for localhost):", clerkError);
      // Don't fail the request if Clerk update fails
    }

    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    console.error("Error updating profile photo:", error);
    return NextResponse.json(
      { error: "Failed to update profile photo", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}


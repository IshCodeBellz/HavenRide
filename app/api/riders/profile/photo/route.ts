import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// PUT update user profile photo
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
      // If it's a relative URL (starts with /), that's also valid for our use case
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

    // Store image URL in our database (Clerk doesn't accept localhost URLs)
    // Ensure User exists first
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // First ensure User exists
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

    // Now update the imageUrl
    await prisma.user.update({
      where: { id: userId },
      data: { imageUrl: imageUrl },
    });

    console.log("Image URL saved to database:", imageUrl);

    // Try to update Clerk as well (may fail for localhost URLs, but that's okay)
    // We don't care if this fails since we're storing in our database
    try {
      await client.users.updateUser(userId, {
        imageUrl: imageUrl,
      });
      console.log("Also updated Clerk (may not persist for localhost URLs)");
    } catch (clerkError: any) {
      console.warn("Clerk update failed (expected for localhost URLs):", clerkError?.message || clerkError);
      // This is okay - we're storing in our database instead
    }

    // Always return success if database save succeeded
    return NextResponse.json({ 
      success: true,
      imageUrl: imageUrl
    });
  } catch (error) {
    console.error("Error updating profile photo:", error);
    return NextResponse.json(
      { error: "Failed to update profile photo", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}


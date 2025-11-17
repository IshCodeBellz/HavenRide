import "./globals.css";
import NavBar from "@/components/NavBar";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "HavenRide - Accessible Transportation",
  description: "Accessible transportation service for everyone",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HavenRide",
  },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/images/HavenRideIcon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#5C7E9B",
  viewportFit: "cover", // Enable safe area insets for mobile devices
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  const isAuthenticated = !!userId;

  return (
    <html lang="en">
      <body className="w-full bg-white">
        <ClerkProvider>
          {!isAuthenticated && <NavBar />}
          <main
            className={`w-full min-h-screen ${
              !isAuthenticated ? "flex justify-center" : ""
            }`}
          >
            {children}
          </main>
        </ClerkProvider>
      </body>
    </html>
  );
}

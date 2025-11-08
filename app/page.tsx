"use client";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import Testimonials from "@/components/Testimonials";
import Footer from "@/components/Footer";

export default function HomePage() {
  const { isSignedIn, user } = useUser();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    async function redirectAuthenticatedUser() {
      if (isSignedIn && user && !isRedirecting) {
        setIsRedirecting(true);
        try {
          const res = await fetch("/api/users/me");
          if (res.ok) {
            const userData = await res.json();
            const role = userData.role;

            if (role === "RIDER") {
              router.replace("/rider");
            } else if (role === "DRIVER") {
              router.replace("/driver");
            } else if (role === "DISPATCHER") {
              router.replace("/dispatcher");
            } else if (role === "ADMIN") {
              router.replace("/admin");
            } else {
              // No role assigned, redirect to auth callback to auto-assign RIDER
              router.replace("/auth-callback");
            }
          } else {
            // Failed to fetch role, redirect to auth callback to create user
            router.replace("/auth-callback");
          }
        } catch (error) {
          console.error("Error redirecting user:", error);
          // On error, redirect to auth callback
          router.replace("/auth-callback");
        }
      }
    }

    redirectAuthenticatedUser();
  }, [isSignedIn, user, router, isRedirecting]);

  // Show loading while redirecting
  if (isSignedIn && isRedirecting) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-[#0F3D3E]">
            Redirecting...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white">
      {/* Hero Section */}
      <Hero isSignedIn={isSignedIn} />

      {/* How It Works Section */}
      <HowItWorks />

      {/* Testimonials Section */}
      <Testimonials />

      {/* Footer */}
      <Footer />
    </div>
  );
}

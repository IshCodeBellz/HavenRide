"use client";
import Link from "next/link";
import Image from "next/image";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import CenteredContainer from "./CenteredContainer";

export default function NavBar() {
  const { isSignedIn } = useUser();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!isSignedIn) {
        setRole(null);
        return;
      }
      try {
        // Ensure user has a role (auto-assigns RIDER if needed)
        await fetch("/api/users/ensure-role");

        // Then fetch user data
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const data = await res.json();
          setRole(data.role || null);
        }
      } catch {
        // Ignore errors fetching role
      }
    })();
  }, [isSignedIn]);

  return (
    <nav className="w-full bg-white border-b border-gray-100 sticky top-0 z-50 safe-area-top">
      <CenteredContainer className="px-0!">
        <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-16 h-16 bg-[#FEF9FA]  rounded-full flex items-center justify-center overflow-visible relative">
              <Image
                src="/images/HavenRideIcon.png"
                alt="HavenRide Logo"
                width={125}
                height={125}
                className="object-contain w-[140%] h-[140%] absolute"
              />
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-10 flex-1 justify-center">
            <Link
              href="/"
              className="text-neutral-700 hover:text-[#5C7E9B] font-medium transition-colors text-sm"
            >
              Home
            </Link>
            <Link
              href="#how-it-works"
              className="text-neutral-700 hover:text-[#5C7E9B] font-medium transition-colors text-sm"
            >
              How It Works
            </Link>
            <Link
              href="#accessibility"
              className="text-neutral-700 hover:text-[#5C7E9B] font-medium transition-colors text-sm"
            >
              Accessibility
            </Link>
            <Link
              href="#support"
              className="text-neutral-700 hover:text-[#5C7E9B] font-medium transition-colors text-sm"
            >
              Support
            </Link>
          </div>

          {/* Auth & CTA */}
          <div className="flex items-center gap-4 shrink-0">
            {isSignedIn ? (
              <div className="flex items-center gap-4">
                {role && (
                  <Link
                    href={
                      role === "RIDER"
                        ? "/rider"
                        : role === "DRIVER"
                        ? "/driver"
                        : role === "DISPATCHER"
                        ? "/dispatcher"
                        : "/admin"
                    }
                    className="text-neutral-700 hover:text-[#5C7E9B] font-medium transition-colors text-sm"
                  >
                    Dashboard
                  </Link>
                )}
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <SignInButton mode="modal" forceRedirectUrl="/auth-callback">
                  <button className="text-neutral-700 hover:text-[#5C7E9B] font-medium transition-colors text-sm">
                    Sign In
                  </button>
                </SignInButton>
                <SignInButton mode="modal" forceRedirectUrl="/auth-callback">
                  <button className="bg-[#5C7E9B] text-white px-6 py-3 rounded-2xl font-semibold text-sm hover:bg-[#5C7E9B]/90 transition-colors whitespace-nowrap">
                    Book a Ride
                  </button>
                </SignInButton>
              </div>
            )}
          </div>
        </div>
      </CenteredContainer>
    </nav>
  );
}

"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

/**
 * Auth Callback Page
 * Redirects users to the appropriate dashboard based on their role after sign-in
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    let isMounted = true;

    async function redirectUser() {
      if (!isLoaded) return;

      if (!user?.id) {
        if (isMounted) router.push("/");
        return;
      }

      try {
        // Small delay to ensure Clerk session is fully established
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Ensure user has a role (auto-assigns RIDER if none)
        const ensureRes = await fetch("/api/users/ensure-role");
        if (!ensureRes.ok) {
          const errorData = await ensureRes.json();
          console.error("Failed to ensure role:", errorData);
          throw new Error("Failed to ensure role");
        }

        const ensureData = await ensureRes.json();
        console.log("Role ensured:", ensureData);

        // Wait a bit for DB to commit
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Fetch user data to get role
        const res = await fetch("/api/users/me");
        if (!res.ok) {
          console.error("Failed to fetch user data");
          throw new Error("Failed to fetch user data");
        }

        const data = await res.json();
        const userRole = data.role;
        console.log("User role:", userRole);

        if (!isMounted) return;

        // Redirect based on role with replace to prevent back button loop
        if (userRole === "DRIVER") {
          router.replace("/driver");
        } else if (userRole === "RIDER") {
          router.replace("/rider");
        } else if (userRole === "DISPATCHER") {
          router.replace("/dispatcher");
        } else if (userRole === "ADMIN") {
          router.replace("/admin");
        } else {
          // Fallback: if still no role, redirect to rider
          router.replace("/rider");
        }
      } catch (error) {
        console.error("Error in auth callback:", error);
        // On error, still try to redirect to rider (default role)
        if (isMounted) router.replace("/rider");
      }
    }

    redirectUser();

    return () => {
      isMounted = false;
    };
  }, [user, isLoaded, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B] mx-auto mb-4"></div>
        <p className="text-neutral-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}

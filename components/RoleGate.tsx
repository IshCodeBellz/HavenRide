"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

interface RoleGateProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export default function RoleGate({ children, requiredRole }: RoleGateProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasRole, setHasRole] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkRole() {
      if (!isLoaded) return;

      if (!user?.id) {
        if (isMounted) router.replace("/");
        return;
      }

      try {
        // Ensure user has a role (will create as RIDER if doesn't exist)
        const ensureRes = await fetch("/api/users/ensure-role");
        if (!ensureRes.ok) {
          const errorText = await ensureRes.text();
          console.error("RoleGate: Failed to ensure role:", errorText);
        }

        // Small delay to let DB commit
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Then fetch user data
        const res = await fetch("/api/users/me");
        if (!res.ok) {
          console.error(
            "RoleGate: Failed to fetch user data, status:",
            res.status
          );
          if (isMounted) {
            setChecking(false);
            // User doesn't exist in DB yet, let them through and retry will happen
            setHasRole(true);
          }
          return;
        }

        const data = await res.json();
        const userRole = data.role;
        const isAdmin = data.isAdmin || false;

        console.log(
          "RoleGate: User role is",
          userRole,
          "isAdmin:",
          isAdmin,
          "Required:",
          requiredRole
        );

        if (!isMounted) return;

        if (!userRole) {
          // Still no role, but allow through - user might be newly created
          console.log("RoleGate: No role found yet, allowing through");
          setHasRole(true);
          setChecking(false);
          return;
        }

        // If user is admin, allow access to admin pages
        if (isAdmin && requiredRole?.includes("ADMIN")) {
          console.log("RoleGate: Admin access granted");
          setHasRole(true);
          setChecking(false);
          return;
        }

        // If specific role required, check it
        if (requiredRole && !requiredRole.includes(userRole)) {
          // Redirect to their appropriate dashboard
          console.log(
            "RoleGate: User doesn't have required role, redirecting to their dashboard"
          );
          if (userRole === "RIDER") {
            router.replace("/rider");
          } else if (userRole === "DRIVER") {
            router.replace("/driver");
          } else if (userRole === "DISPATCHER") {
            router.replace("/dispatcher");
          } else if (userRole === "ADMIN") {
            router.replace("/admin");
          } else {
            router.replace("/");
          }
          return;
        }

        console.log("RoleGate: Access granted");
        setHasRole(true);
      } catch (e) {
        console.error("RoleGate: Error checking role:", e);
        // On error, allow through to prevent infinite loops
        if (isMounted) {
          setHasRole(true);
        }
      } finally {
        if (isMounted) {
          setChecking(false);
        }
      }
    }

    checkRole();

    return () => {
      isMounted = false;
    };
  }, [user, isLoaded, router, requiredRole]);

  if (checking) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!hasRole) {
    return null;
  }

  return <>{children}</>;
}

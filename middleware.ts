import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // If user is authenticated and on homepage, redirect based on role
  if (userId && pathname === "/") {
    try {
      const userRes = await fetch(
        new URL("/api/users/me", req.url).toString(),
        {
          headers: {
            cookie: req.headers.get("cookie") || "",
          },
        }
      );

      if (userRes.ok) {
        const userData = await userRes.json();
        const role = userData.role;

        if (role === "RIDER") {
          return NextResponse.redirect(new URL("/rider", req.url));
        } else if (role === "DRIVER") {
          return NextResponse.redirect(new URL("/driver", req.url));
        } else if (role === "DISPATCHER") {
          return NextResponse.redirect(new URL("/dispatcher", req.url));
        } else if (role === "ADMIN") {
          return NextResponse.redirect(new URL("/admin", req.url));
        } else {
          // User has no role, redirect to role selection
          return NextResponse.redirect(new URL("/role-select", req.url));
        }
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      // On error, redirect to role selection to be safe
      return NextResponse.redirect(new URL("/role-select", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};

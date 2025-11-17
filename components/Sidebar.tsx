"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

interface SidebarProps {
  userRole?: string;
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const getRoleBasePath = () => {
    if (userRole === "DRIVER") return "/driver";
    if (userRole === "DISPATCHER") return "/dispatcher";
    if (userRole === "ADMIN") return "/admin";
    return "/rider";
  };

  const basePath = getRoleBasePath();

  return (
    <div className="w-16 sm:w-20 md:w-64 min-h-screen bg-[#5C7E9B] text-white flex flex-col safe-area-sidebar">
      {/* Logo */}
      <div
        className="p-2 sm:p-3 md:p-6 flex justify-center safe-area-top"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)",
        }}
      >
        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-32 md:h-32 bg-[#FEF9FA] rounded-full flex items-center justify-center p-1 sm:p-2 md:p-4">
          <Image
            src="/images/HavenRideIcon.png"
            alt="HavenRide Logo"
            width={32}
            height={32}
            className="object-contain w-full h-full"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-1 sm:px-2 md:px-4 space-y-1 md:space-y-2">
        <Link
          href={basePath}
          className={`flex items-center justify-center md:justify-start gap-0 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-lg transition-colors ${
            isActive(basePath)
              ? "bg-[#4A6B85]"
              : "hover:bg-[#4A6B85] hover:bg-opacity-50"
          }`}
          title="Home"
        >
          <svg
            className="w-5 h-5 md:w-5 md:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span className="hidden md:inline">Home</span>
        </Link>

        <Link
          href={`${basePath}/past-rides`}
          className={`flex items-center justify-center md:justify-start gap-0 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-lg transition-colors ${
            isActive(`${basePath}/past-rides`)
              ? "bg-[#4A6B85]"
              : "hover:bg-[#4A6B85] hover:bg-opacity-50"
          }`}
          title="Past Rides"
        >
          <svg
            className="w-5 h-5 md:w-5 md:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="hidden md:inline">Past Rides</span>
        </Link>

        <Link
          href={`${basePath}/support`}
          className={`flex items-center justify-center md:justify-start gap-0 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-lg transition-colors ${
            isActive(`${basePath}/support`)
              ? "bg-[#4A6B85]"
              : "hover:bg-[#4A6B85] hover:bg-opacity-50"
          }`}
          title="Support"
        >
          <svg
            className="w-5 h-5 md:w-5 md:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="hidden md:inline">Support</span>
        </Link>

        <Link
          href={`${basePath}/profile`}
          className={`flex items-center justify-center md:justify-start gap-0 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-lg transition-colors ${
            isActive(`${basePath}/profile`)
              ? "bg-[#4A6B85]"
              : "hover:bg-[#4A6B85] hover:bg-opacity-50"
          }`}
          title="Profile"
        >
          <svg
            className="w-5 h-5 md:w-5 md:h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="hidden md:inline">Profile</span>
        </Link>

        {/* Driver-specific links */}
        {userRole === "DRIVER" && (
          <Link
            href="/driver/earnings"
            className={`flex items-center justify-center md:justify-start gap-0 md:gap-3 px-2 md:px-4 py-2 md:py-3 rounded-lg transition-colors ${
              isActive("/driver/earnings")
                ? "bg-[#4A6B85]"
                : "hover:bg-[#4A6B85] hover:bg-opacity-50"
            }`}
            title="Earnings"
          >
            <svg
              className="w-5 h-5 md:w-5 md:h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="hidden md:inline">Earnings</span>
          </Link>
        )}
      </nav>

      {/* User Profile at bottom */}
      <div className="p-2 md:p-4 border-t border-[#4A6B85] safe-area-bottom">
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
          <UserButton afterSignOutUrl="/" />
          <div className="hidden md:block flex-1">
            <p className="text-sm font-medium">Account</p>
            <p className="text-xs text-gray-300">{userRole || "User"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

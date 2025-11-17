"use client";
import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import SOSButton from "./SOSButton";
import RoleSwitcher from "./RoleSwitcher";

interface AppLayoutProps {
  children: ReactNode;
  userRole?: string;
  isAdmin?: boolean;
}

export default function AppLayout({
  children,
  userRole,
  isAdmin = false,
}: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userRole={userRole} />
      <main className="flex-1 overflow-auto">
        {/* Role Switcher - Visible for admins */}
        {isAdmin && userRole && (
          <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center safe-area-top">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                ADMIN MODE
              </span>
            </div>
            <RoleSwitcher currentRole={userRole} isAdmin={isAdmin} />
          </div>
        )}
        {children}
      </main>
      {/* SOS Button for Riders and Drivers */}
      {(userRole === "RIDER" || userRole === "DRIVER") && <SOSButton />}
    </div>
  );
}

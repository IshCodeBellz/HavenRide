"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface RoleSwitcherProps {
  currentRole: string;
  isAdmin: boolean;
}

export default function RoleSwitcher({
  currentRole,
  isAdmin,
}: RoleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const router = useRouter();

  const roles = [
    { value: "DRIVER", label: "Driver", icon: "�", path: "/driver" },
    { value: "RIDER", label: "Rider", icon: "�", path: "/rider" },
    {
      value: "DISPATCHER",
      label: "Dispatcher",
      icon: "�",
      path: "/dispatcher",
    },
  ];

  // Add admin option for quick access
  const adminOption = {
    value: "ADMIN",
    label: "Admin Panel",
    icon: "👑",
    path: "/admin",
  };

  async function handleRoleSwitch(role: string, path: string) {
    if (role === currentRole) {
      setIsOpen(false);
      return;
    }

    // If switching to admin panel, just navigate
    if (role === "ADMIN") {
      router.push(path);
      setIsOpen(false);
      return;
    }

    setSwitching(true);
    try {
      const res = await fetch("/api/admin/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (res.ok) {
        // Redirect to the appropriate dashboard
        router.push(path);
        router.refresh();
      } else {
        alert("Failed to switch role");
      }
    } catch (error) {
      console.error("Error switching role:", error);
      alert("Error switching role");
    } finally {
      setSwitching(false);
      setIsOpen(false);
    }
  }

  // Only show for admins
  if (!isAdmin) return null;

  const currentRoleData =
    roles.find((r) => r.value === currentRole) ||
    (currentRole === "ADMIN" ? adminOption : roles[1]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-[#00796B] hover:bg-[#E0F2F1]/20 transition-all disabled:opacity-50"
      >
        <span className="text-lg">{currentRoleData?.icon}</span>
        <span className="text-sm font-medium text-[#263238]">
          {currentRoleData?.label}
        </span>
        <svg
          className={`w-4 h-4 text-neutral-600 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
            <div className="p-2 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-neutral-600 px-2">
                Switch Role View
              </p>
            </div>

            {/* Admin Panel Option */}
            <button
              onClick={() =>
                handleRoleSwitch(adminOption.value, adminOption.path)
              }
              disabled={switching}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#E0F2F1]/30 transition-colors disabled:opacity-50 border-b border-gray-100 ${
                currentRole === "ADMIN"
                  ? "bg-[#E0F2F1]/50 text-[#00796B] font-medium"
                  : "text-[#263238]"
              }`}
            >
              <span className="text-lg">{adminOption.icon}</span>
              <span className="text-sm">{adminOption.label}</span>
              {currentRole === "ADMIN" && (
                <svg
                  className="w-4 h-4 ml-auto text-[#00796B]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>

            {/* Role Options */}
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => handleRoleSwitch(role.value, role.path)}
                disabled={switching}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#E0F2F1]/30 transition-colors disabled:opacity-50 ${
                  role.value === currentRole
                    ? "bg-[#E0F2F1]/50 text-[#00796B] font-medium"
                    : "text-[#263238]"
                }`}
              >
                <span className="text-lg">{role.icon}</span>
                <span className="text-sm">{role.label}</span>
                {role.value === currentRole && (
                  <svg
                    className="w-4 h-4 ml-auto text-[#00796B]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

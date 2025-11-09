"use client";
import { useState, useEffect } from "react";
import RoleGate from "@/components/RoleGate";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";

function AdminPageContent() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeDrivers: 0,
    todayRides: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(true); // Default to true for admin page

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch user data to check if admin
        const userRes = await fetch("/api/users/me");
        if (userRes.ok) {
          const userData = await userRes.json();
          setIsAdmin(userData.isAdmin || false);
        } else {
          console.error("Failed to fetch user data:", await userRes.text());
        }

        // Fetch stats
        const statsRes = await fetch("/api/admin/stats");
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        } else {
          console.error("Failed to fetch stats:", await statsRes.text());
          // Keep default values of 0 if stats fail to load
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <AppLayout userRole="ADMIN" isAdmin={isAdmin}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#263238] mb-2">
            Admin Dashboard
          </h1>
          <p className="text-sm sm:text-base text-neutral-600">
            Manage users, drivers, and system settings
          </p>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B] mx-auto mb-4"></div>
              <p className="text-neutral-600">Loading statistics...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-sm sm:text-base font-semibold text-neutral-700">
                  Total Users
                </h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#E0F2F1] rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-[#00796B]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-[#263238]">
                {stats.totalUsers}
              </p>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1 sm:mt-2">
                Registered accounts
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-sm sm:text-base font-semibold text-neutral-700">
                  Active Drivers
                </h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#E0F2F1] rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-[#00796B]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7a4 4 0 108 0v3m-4 3v6m-4 0h8"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-[#263238]">
                {stats.activeDrivers}
              </p>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1 sm:mt-2">
                Currently online
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-sm sm:text-base font-semibold text-neutral-700">
                  Today's Rides
                </h3>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#E0F2F1] rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-[#00796B]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-3xl sm:text-4xl font-bold text-[#263238]">
                {stats.todayRides}
              </p>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1 sm:mt-2">
                Completed bookings
              </p>
            </div>
          </div>
        )}

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* User Management */}
          <Link href="/admin/users">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-4 sm:p-6 hover:shadow-lg hover:border-[#00796B] transition-all cursor-pointer group">
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#E0F2F1] rounded-xl flex items-center justify-center group-hover:bg-[#00796B] transition-colors shrink-0">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-[#00796B] group-hover:text-white transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-[#263238]">
                    User Management
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 truncate">
                    Manage riders, drivers, dispatchers
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-neutral-600">View all users</span>
                <svg
                  className="w-5 h-5 text-neutral-400 group-hover:text-[#00796B] group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>

          {/* Rides Monitor */}
          <Link href="/admin/rides">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:border-[#00796B] transition-all cursor-pointer group">
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#E0F2F1] rounded-xl flex items-center justify-center group-hover:bg-[#00796B] transition-colors shrink-0">
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-[#00796B] group-hover:text-white transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-[#263238]">
                    Rides Monitor
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 truncate">
                    Track all bookings & analytics
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-neutral-600">View all rides</span>
                <svg
                  className="w-5 h-5 text-neutral-400 group-hover:text-[#00796B] group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>

          {/* Finance & Billing */}
          <Link href="/admin/finance">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:border-[#00796B] transition-all cursor-pointer group">
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-12 h-12 bg-[#E0F2F1] rounded-xl flex items-center justify-center group-hover:bg-[#00796B] transition-colors">
                  <svg
                    className="w-6 h-6 text-[#00796B] group-hover:text-white transition-colors"
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
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#263238]">
                    Finance & Billing
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Payments, commissions, payouts
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">View financial data</span>
                <svg
                  className="w-5 h-5 text-neutral-400 group-hover:text-[#00796B] group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>

          {/* Compliance */}
          <Link href="/admin/compliance">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:border-[#00796B] transition-all cursor-pointer group">
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-12 h-12 bg-[#E0F2F1] rounded-xl flex items-center justify-center group-hover:bg-[#00796B] transition-colors">
                  <svg
                    className="w-6 h-6 text-[#00796B] group-hover:text-white transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#263238]">
                    Compliance
                  </h3>
                  <p className="text-sm text-neutral-500">
                    DBS, training, GDPR records
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">View compliance data</span>
                <svg
                  className="w-5 h-5 text-neutral-400 group-hover:text-[#00796B] group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>

          {/* Support Center */}
          <Link href="/admin/support">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:border-[#00796B] transition-all cursor-pointer group">
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-12 h-12 bg-[#E0F2F1] rounded-xl flex items-center justify-center group-hover:bg-[#00796B] transition-colors">
                  <svg
                    className="w-6 h-6 text-[#00796B] group-hover:text-white transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#263238]">
                    Support Center
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Tickets, escalations, notifications
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">Manage support</span>
                <svg
                  className="w-5 h-5 text-neutral-400 group-hover:text-[#00796B] group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>

          {/* Dispatcher Management */}
          <Link href="/admin/dispatchers">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-lg hover:border-[#00796B] transition-all cursor-pointer group">
              <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="w-12 h-12 bg-[#E0F2F1] rounded-xl flex items-center justify-center group-hover:bg-[#00796B] transition-colors">
                  <svg
                    className="w-6 h-6 text-[#00796B] group-hover:text-white transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#263238]">
                    Dispatcher Management
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Performance, regions, shifts
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-600">Manage dispatchers</span>
                <svg
                  className="w-5 h-5 text-neutral-400 group-hover:text-[#00796B] group-hover:translate-x-1 transition-all"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Legacy Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-[#263238] mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/metrics"
              className="flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-[#00796B] hover:bg-[#E0F2F1]/30 transition-all group"
            >
              <div className="w-10 h-10 bg-[#00796B] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-[#263238]">View Metrics</h3>
                <p className="text-sm text-neutral-500">Analytics & reports</p>
              </div>
            </Link>

            <Link
              href="/admin/ops"
              className="flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-[#00796B] hover:bg-[#E0F2F1]/30 transition-all group"
            >
              <div className="w-10 h-10 bg-[#26A69A] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-[#263238]">Operations</h3>
                <p className="text-sm text-neutral-500">Manage bookings</p>
              </div>
            </Link>

            <Link
              href="/admin/settings"
              className="flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-[#00796B] hover:bg-[#E0F2F1]/30 transition-all group"
            >
              <div className="w-10 h-10 bg-[#4DB6AC] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-[#263238]">Settings</h3>
                <p className="text-sm text-neutral-500">System config</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function AdminPage() {
  return (
    <RoleGate requiredRole={["ADMIN"]}>
      <AdminPageContent />
    </RoleGate>
  );
}

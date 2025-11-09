"use client";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import RoleGate from "@/components/RoleGate";

function AdminMetricsContent() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const [bookingsRes] = await Promise.all([fetch("/api/bookings")]);
      const bookings = await bookingsRes.json();

      const completed = bookings.filter((b: any) => b.status === "COMPLETED");
      const revenue = completed.reduce((sum: number, b: any) => {
        return sum + (b.finalFareAmount || 0);
      }, 0);

      setStats({
        totalBookings: bookings.length,
        completedBookings: completed.length,
        requestedBookings: bookings.filter((b: any) => b.status === "REQUESTED")
          .length,
        revenue,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AppLayout userRole="ADMIN">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B] mx-auto mb-4"></div>
              <p className="text-neutral-600">Loading metrics...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout userRole="ADMIN">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#263238] mb-2">
            Metrics & Analytics
          </h1>
          <p className="text-neutral-600">System performance and statistics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-neutral-500 mb-2 uppercase tracking-wide">
              Total Bookings
            </h3>
            <p className="text-4xl font-bold text-[#263238]">
              {stats?.totalBookings || 0}
            </p>
            <div className="mt-3 flex items-center text-xs text-green-600">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              All time
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-neutral-500 mb-2 uppercase tracking-wide">
              Completed
            </h3>
            <p className="text-4xl font-bold text-[#263238]">
              {stats?.completedBookings || 0}
            </p>
            <div className="mt-3 text-xs text-neutral-500">
              Successfully finished
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-neutral-500 mb-2 uppercase tracking-wide">
              Pending
            </h3>
            <p className="text-4xl font-bold text-[#263238]">
              {stats?.requestedBookings || 0}
            </p>
            <div className="mt-3 text-xs text-amber-600">Awaiting action</div>
          </div>

          <div className="bg-gradient-to-br from-[#00796B] to-[#26A69A] rounded-xl shadow-sm p-6 text-white hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold mb-2 uppercase tracking-wide opacity-90">
              Total Revenue
            </h3>
            <p className="text-4xl font-bold">
              £{stats?.revenue.toFixed(2) || "0.00"}
            </p>
            <div className="mt-3 text-xs opacity-80">From completed rides</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-[#263238] mb-4">
            Booking Status Breakdown
          </h2>
          <div className="text-sm text-neutral-500 p-8 text-center bg-gray-50 rounded-lg">
            Detailed breakdown of booking statuses and performance metrics
            <div className="mt-4">
              <span className="text-neutral-400">📊 Coming soon</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function AdminMetricsPage() {
  return (
    <RoleGate requiredRole={["ADMIN"]}>
      <AdminMetricsContent />
    </RoleGate>
  );
}

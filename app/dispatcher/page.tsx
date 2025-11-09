"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getChannel } from "@/lib/realtime/ably";
import RoleGate from "@/components/RoleGate";
import AppLayout from "@/components/AppLayout";

function DispatcherPageContent() {
  const { user } = useUser();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();

    // Subscribe to real-time dispatcher channel
    const channel = getChannel("dispatch");
    const handler = () => {
      fetchBookings();
    };
    (channel as any)?.subscribe?.(handler);

    // Fallback polling
    const timer = setInterval(fetchBookings, 10000);

    return () => {
      (channel as any)?.unsubscribe?.(handler);
      clearInterval(timer);
    };
  }, []);

  async function fetchBookings() {
    try {
      const res = await fetch("/api/bookings");
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function assignDriver(bookingId: string, driverId: string) {
    const res = await fetch(`/api/bookings/${bookingId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ASSIGNED", driverId }),
    });
    if (res.ok) fetchBookings();
  }

  const requested = bookings.filter((b) => b.status === "REQUESTED");
  const active = bookings.filter(
    (b) => b.status !== "COMPLETED" && b.status !== "CANCELED" && b.driverId
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[#263238] mb-2">
          Dispatcher Console
        </h1>
        <p className="text-neutral-600">
          Assign rides and monitor operations in real-time
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B] mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading bookings...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* New Requests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#263238]">
                New Requests
              </h2>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                {requested.length}
              </span>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {requested.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="w-12 h-12 text-neutral-300 mx-auto mb-3"
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
                  <p className="text-sm text-neutral-500">No new requests</p>
                </div>
              ) : (
                requested.map((booking) => (
                  <div
                    key={booking.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-[#00796B] hover:bg-[#E0F2F1]/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[#263238] mb-2">
                          📍 {booking.pickupAddress}
                        </div>
                        <div className="text-sm text-neutral-600 mb-2">
                          🎯 {booking.dropoffAddress}
                        </div>
                      </div>
                      {booking.requiresWheelchair && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          ♿ Wheelchair
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-neutral-500 mb-3">
                      <span>Rider: {booking.riderId.slice(0, 8)}...</span>
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                        {booking.status}
                      </span>
                    </div>
                    <button
                      onClick={() => assignDriver(booking.id, user?.id || "")}
                      className="w-full px-4 py-2 bg-[#00796B] text-white rounded-lg hover:bg-[#00695C] transition-colors font-medium"
                    >
                      Assign to Driver
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Rides */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#263238]">
                Active Rides
              </h2>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                {active.length}
              </span>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {active.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="w-12 h-12 text-neutral-300 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-neutral-500">No active rides</p>
                </div>
              ) : (
                active.map((booking) => (
                  <div
                    key={booking.id}
                    className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-green-50/50 to-transparent"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[#263238] mb-2">
                          📍 {booking.pickupAddress}
                        </div>
                        <div className="text-sm text-neutral-600 mb-2">
                          🎯 {booking.dropoffAddress}
                        </div>
                      </div>
                      {booking.requiresWheelchair && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          ♿
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-600">
                        Driver: {booking.driverId?.slice(0, 8) || "Unassigned"}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full font-medium ${
                          booking.status === "IN_PROGRESS"
                            ? "bg-purple-100 text-purple-700"
                            : booking.status === "EN_ROUTE"
                            ? "bg-blue-100 text-blue-700"
                            : booking.status === "ARRIVED"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-[#263238] mb-6">
          Overview Statistics
        </h2>
        {bookings.length === 0 ? (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 text-neutral-300 mx-auto mb-3"
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
            <p className="text-sm text-neutral-500">No bookings yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <div className="text-3xl font-bold text-amber-700">
                {requested.length}
              </div>
              <div className="text-sm text-amber-600 mt-1">Requested</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-700">
                {active.length}
              </div>
              <div className="text-sm text-green-600 mt-1">Active</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-700">
                {bookings.filter((b) => b.status === "COMPLETED").length}
              </div>
              <div className="text-sm text-blue-600 mt-1">Completed</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-3xl font-bold text-[#263238]">
                {bookings.length}
              </div>
              <div className="text-sm text-neutral-600 mt-1">Total</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DispatcherPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.isAdmin || false);
        }
      } catch (error) {
        console.error("Failed to check admin status:", error);
      }
    }
    checkAdmin();
  }, []);

  return (
    <RoleGate requiredRole={["DISPATCHER"]}>
      <AppLayout userRole="DISPATCHER" isAdmin={isAdmin}>
        <DispatcherPageContent />
      </AppLayout>
    </RoleGate>
  );
}

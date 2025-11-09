"use client";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import RoleGate from "@/components/RoleGate";

function AdminOpsContent() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
    const timer = setInterval(fetchBookings, 10000);
    return () => clearInterval(timer);
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

  return (
    <AppLayout userRole="ADMIN">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#263238] mb-2">Operations</h1>
          <p className="text-neutral-600">
            Manage bookings and system operations
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      Booking ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      Rider
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-neutral-500"
                      >
                        <div className="flex flex-col items-center">
                          <svg
                            className="w-12 h-12 text-neutral-300 mb-3"
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
                          <p className="font-medium">No bookings yet</p>
                          <p className="text-sm text-neutral-400 mt-1">
                            Bookings will appear here as they are created
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    bookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className="hover:bg-[#E0F2F1]/30 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-xs text-neutral-600">
                          {booking.id.slice(0, 8)}...
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-neutral-600">
                          {booking.riderId.slice(0, 8)}...
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs">
                            <div className="font-medium text-[#263238] truncate max-w-xs">
                              📍 {booking.pickupAddress}
                            </div>
                            <div className="text-neutral-500 truncate max-w-xs mt-1">
                              🎯 {booking.dropoffAddress}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              booking.status === "COMPLETED"
                                ? "bg-green-100 text-green-700"
                                : booking.status === "REQUESTED"
                                ? "bg-amber-100 text-amber-700"
                                : booking.status === "ACCEPTED"
                                ? "bg-blue-100 text-blue-700"
                                : booking.status === "IN_PROGRESS"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-neutral-500 text-xs">
                          {new Date(booking.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function AdminOpsPage() {
  return (
    <RoleGate requiredRole={["ADMIN"]}>
      <AdminOpsContent />
    </RoleGate>
  );
}

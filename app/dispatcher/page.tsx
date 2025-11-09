"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getChannel } from "@/lib/realtime/ably";
import RoleGate from "@/components/RoleGate";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import ChatWidget from "@/components/ChatWidget";

function DispatcherPageContent() {
  const { user } = useUser();
  const [bookings, setBookings] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [chatBookingId, setChatBookingId] = useState<string | null>(null);
  const [autoAssigning, setAutoAssigning] = useState<string | null>(null);

  // Create booking form state
  const [createForm, setCreateForm] = useState({
    riderIdentifier: "",
    pickupAddress: "",
    dropoffAddress: "",
    wheelchairRequired: false,
    scheduledFor: "",
    notes: "",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchBookings();
    fetchDrivers();

    // Subscribe to real-time dispatcher channel
    const channel = getChannel("dispatch");
    const handler = () => {
      fetchBookings();
      fetchDrivers();
    };
    (channel as any)?.subscribe?.(handler);

    // Fallback polling
    const timer = setInterval(() => {
      fetchBookings();
      fetchDrivers();
    }, 10000);

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

  async function fetchDrivers() {
    try {
      const res = await fetch("/api/dispatcher/drivers");
      if (res.ok) {
        const data = await res.json();
        setDrivers(Array.isArray(data.drivers) ? data.drivers : []);
      }
    } catch (e) {
      console.error("Failed to fetch drivers:", e);
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

  async function autoAssignDriver(bookingId: string) {
    setAutoAssigning(bookingId);
    try {
      const res = await fetch("/api/dispatcher/auto-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(
          `✅ Auto-assigned to ${data.assignment.driverName}\n` +
            `Distance: ${data.assignment.distance}km\n` +
            `Score: ${data.assignment.score}/100`
        );
        fetchBookings();
      } else {
        const error = await res.json();
        alert(`Failed to auto-assign: ${error.error}`);
      }
    } catch (error) {
      console.error("Error auto-assigning:", error);
      alert("Failed to auto-assign driver");
    } finally {
      setAutoAssigning(null);
    }
  }

  async function handleCreateBooking() {
    if (
      !createForm.riderIdentifier ||
      !createForm.pickupAddress ||
      !createForm.dropoffAddress
    ) {
      alert("Please fill in rider identifier, pickup, and dropoff addresses");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/dispatcher/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (res.ok) {
        alert("Booking created successfully!");
        setShowCreateBooking(false);
        setCreateForm({
          riderIdentifier: "",
          pickupAddress: "",
          dropoffAddress: "",
          wheelchairRequired: false,
          scheduledFor: "",
          notes: "",
        });
        fetchBookings();
      } else {
        const data = await res.json();
        alert(`Failed to create booking: ${data.error}`);
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Failed to create booking");
    } finally {
      setCreating(false);
    }
  }

  const requested = bookings.filter((b) => b.status === "REQUESTED");
  const active = bookings.filter(
    (b) => b.status !== "COMPLETED" && b.status !== "CANCELED" && b.driverId
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#263238] mb-1 sm:mb-2">
              Dispatcher Console
            </h1>
            <p className="text-sm sm:text-base text-neutral-600">
              Assign rides and monitor operations in real-time
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Link
              href="/dispatcher/map"
              className="px-3 py-2 sm:px-4 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Live Map
            </Link>
            <Link
              href="/dispatcher/reports"
              className="px-3 py-2 sm:px-4 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reports
            </Link>
            <button
              onClick={() => setShowCreateBooking(true)}
              className="px-3 py-2 sm:px-4 text-sm bg-[#00796B] text-white rounded-lg hover:bg-[#00695C] transition-colors font-medium"
            >
              + Create
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B] mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading bookings...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* New Requests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-[#263238]">
                New Requests
              </h2>
              <span className="px-2 py-1 sm:px-3 bg-amber-100 text-amber-700 rounded-full text-xs sm:text-sm font-medium">
                {requested.length}
              </span>
            </div>
            <div className="space-y-3 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
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
                    className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-[#00796B] hover:bg-[#E0F2F1]/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-[#263238] mb-1 sm:mb-2 break-words">
                          📍 {booking.pickupAddress}
                        </div>
                        <div className="text-xs sm:text-sm text-neutral-600 mb-1 sm:mb-2 break-words">
                          🎯 {booking.dropoffAddress}
                        </div>
                      </div>
                      {booking.requiresWheelchair && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium shrink-0">
                          ♿
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-neutral-500 mb-3">
                      <span>Rider: {booking.riderId.slice(0, 8)}...</span>
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
                        {booking.status}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => autoAssignDriver(booking.id)}
                          disabled={autoAssigning === booking.id}
                          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {autoAssigning === booking.id ? (
                            <>
                              <svg
                                className="animate-spin h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Auto-assigning...
                            </>
                          ) : (
                            <>
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 10V3L4 14h7v7l9-11h-7z"
                                />
                              </svg>
                              Auto-Assign Best Driver
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setChatBookingId(booking.id)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                          title="Open chat"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowAssignModal(true);
                        }}
                        className="w-full px-4 py-2 border border-[#00796B] text-[#00796B] rounded-lg hover:bg-[#E0F2F1] transition-colors font-medium"
                      >
                        Manual Assignment
                      </button>
                    </div>
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
                    className="border border-gray-200 rounded-lg p-4 bg-green-50/50"
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
                    <div className="flex items-center justify-between text-xs mb-3">
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
                    <button
                      onClick={() => setChatBookingId(booking.id)}
                      className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      Open Chat
                    </button>
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

      {/* Create Booking Modal */}
      {showCreateBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[#263238]">
                Create Booking
              </h2>
              <button
                onClick={() => setShowCreateBooking(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rider Email or Phone
                </label>
                <input
                  type="text"
                  value={createForm.riderIdentifier}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      riderIdentifier: e.target.value,
                    })
                  }
                  placeholder="rider@example.com or +1234567890"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pickup Address
                </label>
                <input
                  type="text"
                  value={createForm.pickupAddress}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      pickupAddress: e.target.value,
                    })
                  }
                  placeholder="Enter pickup location"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dropoff Address
                </label>
                <input
                  type="text"
                  value={createForm.dropoffAddress}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      dropoffAddress: e.target.value,
                    })
                  }
                  placeholder="Enter dropoff location"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={createForm.wheelchairRequired}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          wheelchairRequired: e.target.checked,
                        })
                      }
                      className="rounded text-[#00796B]"
                    />
                    <span className="text-sm text-gray-700">
                      Wheelchair Required
                    </span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.scheduledFor}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        scheduledFor: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={createForm.notes}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, notes: e.target.value })
                  }
                  placeholder="Add any special instructions..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateBooking(false)}
                disabled={creating}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBooking}
                disabled={creating}
                className="px-6 py-2 bg-[#00796B] text-white rounded-lg hover:bg-[#00695C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? "Creating..." : "Create Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Assignment Modal */}
      {showAssignModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#263238]">
                Assign Driver
              </h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedBooking(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">
                  Booking Details
                </div>
                <div className="text-sm">
                  <div className="font-medium text-[#263238]">
                    Pickup: {selectedBooking.pickupAddress}
                  </div>
                  <div className="text-gray-600">
                    Dropoff: {selectedBooking.dropoffAddress}
                  </div>
                  {selectedBooking.requiresWheelchair && (
                    <div className="mt-2 text-amber-700">
                      ♿ Wheelchair Required
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Drivers ({drivers.filter((d) => d.isOnline).length}{" "}
                  online)
                </label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {drivers
                    .filter(
                      (d) =>
                        d.isOnline &&
                        (!selectedBooking.requiresWheelchair ||
                          d.wheelchairCapable)
                    )
                    .map((driver) => (
                      <button
                        key={driver.id}
                        onClick={() => {
                          assignDriver(selectedBooking.id, driver.id);
                          setShowAssignModal(false);
                          setSelectedBooking(null);
                        }}
                        className="w-full p-4 border border-gray-200 rounded-lg hover:border-[#00796B] hover:bg-[#00796B]/5 transition-all text-left"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-[#263238]">
                              {driver.user.name || "Driver"}
                            </div>
                            <div className="text-sm text-gray-600">
                              {driver.vehicleMake} {driver.vehicleModel}
                            </div>
                            {driver.wheelchairCapable && (
                              <span className="text-xs text-amber-600">
                                ♿ Wheelchair Accessible
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-green-600">
                              Online
                            </div>
                            <div className="text-xs text-gray-500">
                              Rating: {driver.rating?.toFixed(1) || "N/A"}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  {drivers.filter(
                    (d) =>
                      d.isOnline &&
                      (!selectedBooking.requiresWheelchair ||
                        d.wheelchairCapable)
                  ).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No available drivers matching requirements
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedBooking(null);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Widget Modal */}
      {chatBookingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#263238]">
                Booking Chat - {chatBookingId.slice(0, 8)}...
              </h2>
              <button
                onClick={() => setChatBookingId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatWidget bookingId={chatBookingId} sender="DISPATCHER" />
            </div>
          </div>
        </div>
      )}
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

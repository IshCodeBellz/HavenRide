"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { getChannel } from "@/lib/realtime/ably";
import ChatWidget from "@/components/ChatWidget";
import RoleGate from "@/components/RoleGate";
import AppLayout from "@/components/AppLayout";
import RideDocumentationForm, {
  RideDocumentation,
} from "@/components/RideDocumentationForm";
import RideConfirmation from "@/components/RideConfirmation";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

function DriverPageContent() {
  const { user } = useUser();
  const [online, setOnline] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [documentingBookingId, setDocumentingBookingId] = useState<
    string | null
  >(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fetchingRef = useRef(false);
  const initialLoadRef = useRef(true);

  const assigned = useMemo(
    () =>
      bookings.find((b) => b.driverId === user?.id && b.status !== "COMPLETED"),
    [bookings, user?.id]
  );

  // Calculate requested bookings and current booking before any hooks
  const requestedBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.status === "REQUESTED")
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ),
    [bookings]
  );

  const currentBooking = requestedBookings[currentIndex];

  // Hooks must be called before any early returns
  const { unreadCount, markAsRead } = useUnreadMessages(
    currentBooking?.id || "",
    "DRIVER"
  );

  const { markAsRead: markActiveChatAsRead } = useUnreadMessages(
    activeBookingId || "",
    "DRIVER"
  );

  async function toggleOnline(next: boolean) {
    const res = await fetch("/api/drivers/set-online", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId: user?.id, online: next }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Unable to change status");
      return;
    }
    setOnline(next);
  }

  useEffect(() => {
    let timer: any;
    if (online) {
      timer = setInterval(async () => {
        await fetch("/api/drivers/update-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driverId: user?.id,
            lat: 51.5 + Math.random() / 100,
            lng: -0.1 + Math.random() / 100,
          }),
        });
      }, 8000);
    }
    return () => timer && clearInterval(timer);
  }, [online, user?.id]);

  // Memoized fetch function to prevent re-creating on every render
  const fetchBookings = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    try {
      const res = await fetch("/api/bookings");
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    } finally {
      fetchingRef.current = false;
      initialLoadRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    fetchBookings();

    // Set up Ably subscription with error handling
    let ch: any = null;
    let subscribed = false;
    let handler: any = null;

    try {
      ch = getChannel(`driver:${user.id}`);
      handler = () => fetchBookings();

      if (ch && !ch.isMock && typeof ch.subscribe === "function") {
        ch.subscribe(handler);
        subscribed = true;
      }
    } catch (error) {
      console.warn("Ably subscription failed, using polling fallback");
    }

    // Polling fallback (only if Ably didn't work, or as backup)
    const timer = setInterval(fetchBookings, 15000); // Increased to 15 seconds

    return () => {
      clearInterval(timer);
      try {
        if (
          subscribed &&
          ch &&
          handler &&
          typeof ch.unsubscribe === "function"
        ) {
          ch.unsubscribe(handler);
        }
      } catch (error) {
        console.warn("Cleanup error:", error);
      }
    };
  }, [user?.id, fetchBookings]);

  async function take(id: string) {
    await fetch(`/api/bookings/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ASSIGNED", driverId: user?.id }),
    });
    fetchBookings();
  }
  async function arrive(id: string) {
    await fetch(`/api/bookings/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ARRIVED" }),
    });
    fetchBookings();
  }
  async function startWithPin(id: string) {
    const pin = prompt("Enter pickup PIN provided by rider");
    if (!pin) return;
    const res = await fetch(`/api/bookings/${id}/verify-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      alert("Invalid PIN");
      return;
    }
    fetchBookings();
  }
  async function complete(id: string) {
    const input = prompt("Final fare (£)? Leave empty to keep estimate.");
    if (input && !isNaN(Number(input))) {
      await fetch(`/api/bookings/${id}/fare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(input), currency: "GBP" }),
      });
    }
    // Show documentation form instead of completing immediately
    setDocumentingBookingId(id);
  }

  async function handleDocumentationSubmit(data: RideDocumentation) {
    if (!documentingBookingId) return;

    try {
      const res = await fetch(
        `/api/bookings/${documentingBookingId}/document`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to document ride");
      }

      setDocumentingBookingId(null);
      await fetchBookings();
    } catch (error) {
      console.error("Failed to document ride:", error);
      throw error;
    }
  }

  // Show confirmation screen if driver has accepted a ride
  if (assigned && (assigned.status === "ASSIGNED" || assigned.status === "EN_ROUTE" || assigned.status === "ARRIVED")) {
    return (
      <RideConfirmation
        booking={assigned}
        userRole="DRIVER"
        onConfirm={async () => {
          // Update status based on current status
          if (assigned.status === "ASSIGNED") {
            // Mark as en route (navigation started)
            await fetch(`/api/bookings/${assigned.id}/status`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "EN_ROUTE" }),
            });
          } else if (assigned.status === "EN_ROUTE") {
            // Mark as arrived at pickup
            await fetch(`/api/bookings/${assigned.id}/status`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "ARRIVED" }),
            });
          }
          fetchBookings();
        }}
        onCancel={async () => {
          if (
            !confirm(
              "Are you sure you want to cancel this ride? The rider will need to find another driver."
            )
          ) {
            return;
          }
          // Unassign driver and set back to REQUESTED
          await fetch(`/api/bookings/${assigned.id}/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "REQUESTED", driverId: null }),
          });
          fetchBookings();
        }}
      />
    );
  }

  const goToNext = () => {
    if (currentIndex < requestedBookings.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#0F3D3E]">
              Driver Console
            </h1>
            <p className="text-base text-gray-600 mt-1">
              {requestedBookings.length} ride
              {requestedBookings.length !== 1 ? "s" : ""} available
            </p>
          </div>
          <label className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
            <span className="text-sm font-medium text-gray-700">
              {online ? "Online" : "Offline"}
            </span>
            <input
              type="checkbox"
              checked={online}
              onChange={(e) => toggleOnline(e.target.checked)}
              className="w-12 h-6 appearance-none bg-gray-300 rounded-full relative cursor-pointer transition-colors checked:bg-[#00796B] before:content-[''] before:absolute before:w-5 before:h-5 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-6"
            />
          </label>
        </div>

        {/* Main Card */}
        {initialLoadRef.current ? (
          <div className="bg-white rounded-2xl p-12 shadow-lg text-center">
            <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
              <svg
                className="w-12 h-12 text-gray-400 animate-spin"
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
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <p className="text-gray-600">Loading bookings...</p>
          </div>
        ) : requestedBookings.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-lg text-center">
            <div className="inline-block p-4 bg-[#E0F2F1] rounded-full mb-4">
              <svg
                className="w-12 h-12 text-[#00796B]"
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
            <h2 className="text-2xl font-bold text-[#0F3D3E] mb-2">
              No Available Jobs
            </h2>
            <p className="text-gray-600 mb-4">
              {online
                ? "All jobs are currently assigned. New ride requests will appear here."
                : "Go online to start receiving ride requests"}
            </p>
            {!online && (
              <button
                onClick={() => toggleOnline(true)}
                className="px-6 py-3 bg-[#00796B] text-white rounded-lg font-semibold hover:bg-[#00695C] transition-colors"
              >
                Go Online
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Main Carousel Container with Preview */}
            <div className="relative overflow-visible">
              <div className="flex items-center justify-center gap-4">
                {/* Previous Ride Preview (Left) */}
                {requestedBookings.length > 1 && currentIndex > 0 && (
                  <div
                    onClick={goToPrevious}
                    className="bg-white rounded-2xl shadow-md border border-gray-300 w-[100px] flex-shrink-0 overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="p-3 h-full flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[#00796B] rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">
                              A
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-600 truncate">
                              {
                                requestedBookings[
                                  currentIndex - 1
                                ].pickupAddress.split(",")[0]
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[#0F3D3E] rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">
                              B
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-600 truncate">
                              {
                                requestedBookings[
                                  currentIndex - 1
                                ].dropoffAddress.split(",")[0]
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-[10px] text-gray-500 font-medium text-center">
                          £
                          {requestedBookings[
                            currentIndex - 1
                          ].priceEstimate?.amount?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Current Card */}
                <div
                  className="bg-white rounded-2xl shadow-lg border-2 border-blue-500 flex-shrink-0 transition-all duration-300"
                  style={{
                    width:
                      requestedBookings.length > 1
                        ? "calc(100% - 240px)"
                        : "100%",
                  }}
                >
                  <div className="p-10">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-8">
                      <span className="text-base font-semibold text-gray-600">
                        Status
                      </span>
                      <span className="px-5 py-2 bg-yellow-100 text-yellow-700 rounded-full text-base font-semibold">
                        {currentBooking.status}
                      </span>
                    </div>

                    {/* Route Information */}
                    <div className="space-y-5 mb-8">
                      <div className="flex items-start gap-5">
                        <div className="w-12 h-12 bg-[#00796B] rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-lg">A</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 font-medium mb-2">
                            Pickup
                          </p>
                          <p className="text-lg font-semibold text-[#0F3D3E]">
                            {currentBooking.pickupAddress}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-5">
                        <div className="w-12 h-12 bg-[#0F3D3E] rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-lg">B</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 font-medium mb-2">
                            Dropoff
                          </p>
                          <p className="text-lg font-semibold text-[#0F3D3E]">
                            {currentBooking.dropoffAddress}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="bg-gray-50 rounded-xl p-5 mb-8 space-y-3">
                      {currentBooking.requiresWheelchair && (
                        <div className="flex items-center gap-2 text-base">
                          <span className="text-3xl">♿</span>
                          <span className="font-medium text-gray-700">
                            Wheelchair accessible vehicle required
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-base">
                        <span className="text-gray-600">Booking ID:</span>
                        <code className="font-mono font-medium text-gray-800">
                          {currentBooking.id.slice(0, 8)}...
                        </code>
                      </div>
                      <div className="flex justify-between text-base">
                        <span className="text-gray-600">Requested:</span>
                        <span className="font-medium text-gray-800">
                          {new Date(currentBooking.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {currentBooking.priceEstimate && (
                        <div className="flex justify-between text-base pt-3 border-t border-gray-200">
                          <span className="text-gray-600 text-lg">Estimated Fare:</span>
                          <span className="text-2xl font-bold text-[#0F3D3E]">
                            £{currentBooking.priceEstimate.amount?.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      <button
                        onClick={() => take(currentBooking.id)}
                        className="flex-1 bg-[#00796B] text-white py-5 rounded-xl text-lg font-semibold hover:bg-[#00695C] transition-colors"
                      >
                        Take Ride
                      </button>
                      <button
                        onClick={() => arrive(currentBooking.id)}
                        className="px-8 py-5 bg-gray-100 text-gray-700 rounded-xl text-lg font-semibold hover:bg-gray-200 transition-colors"
                      >
                        Arrived
                      </button>
                    </div>

                    {/* Open Chat Link */}
                    <button
                      onClick={() => {
                        markAsRead();
                        setActiveBookingId(currentBooking.id);
                      }}
                      className="w-full mt-4 text-base text-[#00796B] hover:text-[#0F3D3E] font-semibold underline relative"
                    >
                      Open Chat
                      {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Next Ride Preview */}
                {requestedBookings.length > 1 &&
                  currentIndex < requestedBookings.length - 1 && (
                    <div
                      onClick={goToNext}
                      className="bg-white rounded-2xl shadow-md border border-gray-300 w-[100px] flex-shrink-0 overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="p-3 h-full flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-[#00796B] rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-bold">
                                A
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-gray-600 truncate">
                                {
                                  requestedBookings[
                                    currentIndex + 1
                                  ].pickupAddress.split(",")[0]
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-[#0F3D3E] rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white text-xs font-bold">
                                B
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-gray-600 truncate">
                                {
                                  requestedBookings[
                                    currentIndex + 1
                                  ].dropoffAddress.split(",")[0]
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                        {requestedBookings[currentIndex + 1].priceEstimate && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs font-bold text-[#0F3D3E] text-center">
                              £
                              {requestedBookings[
                                currentIndex + 1
                              ].priceEstimate.amount?.toFixed(2)}
                            </p>
                          </div>
                        )}
                        <div className="mt-2 flex justify-center">
                          <svg
                            className="w-4 h-4 text-gray-400"
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
                    </div>
                  )}
              </div>
            </div>

            {/* Carousel Navigation */}
            {requestedBookings.length > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  className="p-3 rounded-full bg-white shadow-md border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-gray-700"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>

                <div className="flex items-center gap-2">
                  {requestedBookings.map((_: any, index: number) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentIndex
                          ? "w-8 bg-[#00796B]"
                          : "w-2 bg-gray-300"
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={goToNext}
                  disabled={currentIndex === requestedBookings.length - 1}
                  className="p-3 rounded-full bg-white shadow-md border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-gray-700"
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
                </button>
              </div>
            )}
          </div>
        )}

        {/* Chat Modal */}
        {activeBookingId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-[#0F3D3E]">
                  Chat with Rider
                </h3>
                <button
                  onClick={() => setActiveBookingId(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-gray-600"
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
                {(() => {
                  const activeBooking = bookings.find(
                    (b) => b.id === activeBookingId
                  );
                  const isCompleted =
                    activeBooking?.status === "COMPLETED" ||
                    activeBooking?.status === "CANCELED";

                  if (isCompleted) {
                    return (
                      <div className="h-full flex items-center justify-center p-6">
                        <div className="text-center">
                          <p className="font-semibold text-gray-800 mb-2">
                            Chat Closed
                          </p>
                          <p className="text-gray-600">
                            This ride has been completed
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <ChatWidget
                      key={activeBookingId}
                      bookingId={activeBookingId}
                      sender="DRIVER"
                      onMarkAsRead={markActiveChatAsRead}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ride Documentation Modal */}
      {documentingBookingId && (
        <RideDocumentationForm
          bookingId={documentingBookingId}
          onSubmit={handleDocumentationSubmit}
          onCancel={() => setDocumentingBookingId(null)}
        />
      )}
    </div>
  );
}

export default function DriverPage() {
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
    <RoleGate requiredRole={["DRIVER"]}>
      <AppLayout userRole="DRIVER" isAdmin={isAdmin}>
        <DriverPageContent />
      </AppLayout>
    </RoleGate>
  );
}

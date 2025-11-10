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
import BookingMap from "@/components/BookingMap";

function DriverPageContent() {
  const { user } = useUser();
  const [online, setOnline] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [documentingBookingId, setDocumentingBookingId] = useState<
    string | null
  >(null);
  const [driverLocation, setDriverLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Debug: Log when documentingBookingId changes
  useEffect(() => {
    console.log("documentingBookingId changed to:", documentingBookingId);
  }, [documentingBookingId]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const fetchingRef = useRef(false);
  const initialLoadRef = useRef(true);

  const assigned = useMemo(() => {
    const found = bookings.find(
      (b) => 
        b.driverId === user?.id && 
        b.status !== "COMPLETED" && 
        b.status !== "CANCELED"
    );
    console.log("Checking assigned booking:", {
      driverId: user?.id,
      totalBookings: bookings.length,
      assigned: found,
      assignedStatus: found?.status,
    });
    return found;
  }, [bookings, user?.id]);

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

  // Automatically go online when driver logs in
  useEffect(() => {
    if (user?.id && !online) {
      console.log("Auto-setting driver online on login");
      toggleOnline(true);
    }
  }, [user?.id]); // Only run when user logs in

  // Track driver's real location when online OR when they have an active ride
  useEffect(() => {
    let timer: any;
    let watchId: number;

    // Track location if driver is online OR has an active ride
    const shouldTrackLocation = online || (assigned && user?.id);

    if (shouldTrackLocation && user?.id) {
      console.log("Starting location tracking:", {
        online,
        hasActiveRide: !!assigned,
      });

      // Function to update location
      const updateLocation = (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;
        console.log("Updating driver location:", { latitude, longitude });
        setDriverLocation({ lat: latitude, lng: longitude });
        fetch("/api/drivers/update-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driverId: user.id,
            lat: latitude,
            lng: longitude,
          }),
        }).catch((error) => console.error("Failed to update location:", error));
      };

      // Try to get real geolocation
      if (navigator.geolocation) {
        // Get initial position
        navigator.geolocation.getCurrentPosition(updateLocation, (error) => {
          console.error("Geolocation error:", error);
          // Fallback to simulated location if geolocation fails
          fetch("/api/drivers/update-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              driverId: user.id,
              lat: 51.5074,
              lng: -0.1278,
            }),
          });
        });

        // Watch position for continuous updates
        watchId = navigator.geolocation.watchPosition(
          updateLocation,
          (error) => {
            // Handle watch position errors silently - user might have denied permission
            console.warn("Location tracking stopped:", error.message || "Permission denied");
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
      } else {
        // Fallback for browsers without geolocation
        setDriverLocation({ lat: 51.5074, lng: -0.1278 });
        timer = setInterval(async () => {
          await fetch("/api/drivers/update-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              driverId: user.id,
              lat: 51.5074,
              lng: -0.1278,
            }),
          });
        }, 8000);
      }
    } else {
      console.log("Location tracking stopped");
    }

    return () => {
      if (timer) clearInterval(timer);
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [online, user?.id, assigned]);

  // Memoized fetch function to prevent re-creating on every render
  const fetchBookings = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchingRef.current) {
      console.log("Fetch already in progress, skipping");
      return;
    }

    fetchingRef.current = true;
    try {
      console.log("Fetching bookings...");
      const res = await fetch("/api/bookings");
      const data = await res.json();
      console.log("Fetched bookings:", data.length, "bookings");
      console.log("Driver ID:", user?.id);
      const assignedBooking = data.find(
        (b: any) => b.driverId === user?.id && b.status !== "COMPLETED"
      );
      console.log("Assigned booking:", assignedBooking);
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    } finally {
      fetchingRef.current = false;
      initialLoadRef.current = false;
    }
  }, [user?.id]);

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
    try {
      console.log("Taking ride:", id, "Driver ID:", user?.id);
      const res = await fetch(`/api/bookings/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ASSIGNED", driverId: user?.id }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("Failed to accept ride:", error);
        alert(error.error || "Failed to accept ride");
        return;
      }

      const result = await res.json();
      console.log("Ride accepted successfully:", result);

      // Fetch updated bookings with a small delay to ensure database is updated
      setTimeout(() => {
        fetchBookings();
      }, 500);
    } catch (error) {
      console.error("Error accepting ride:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred while accepting the ride";
      alert(errorMessage);
    }
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
    // Show documentation form - no fare prompt needed
    console.log("complete() called with ID:", id);
    setDocumentingBookingId(id);
    console.log("documentingBookingId set to:", id);
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
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to document ride");
      }

      // Successfully completed
      setDocumentingBookingId(null);
      await fetchBookings();
    } catch (error) {
      console.error("Failed to document ride:", error);
      alert(error instanceof Error ? error.message : "Failed to complete ride. Please try again.");
      throw error;
    }
  }

  // Show confirmation screen if driver has accepted a ride
  if (
    assigned &&
    (assigned.status === "ASSIGNED" ||
      assigned.status === "EN_ROUTE" ||
      assigned.status === "ARRIVED" ||
      assigned.status === "IN_PROGRESS")
  ) {
    return (
      <>
        <RideConfirmation
          booking={assigned}
          userRole="DRIVER"
          onConfirm={async () => {
            // Use the booking prop directly to avoid stale state issues
            const currentBooking = assigned;
            if (!currentBooking) {
              console.error("No assigned booking found");
              return;
            }

            console.log("onConfirm called with status:", currentBooking.status);

            // Update status based on current status
            if (currentBooking.status === "ASSIGNED") {
              // Mark as en route (navigation started)
              await fetch(`/api/bookings/${currentBooking.id}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "EN_ROUTE" }),
              });
            } else if (currentBooking.status === "EN_ROUTE") {
              // Mark as arrived at pickup (no navigation)
              await fetch(`/api/bookings/${currentBooking.id}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "ARRIVED" }),
              });
            } else if (currentBooking.status === "ARRIVED") {
              // Verify PIN and start trip
              const pin = prompt("Enter pickup PIN provided by rider");
              if (!pin) return;
              
              const res = await fetch(`/api/bookings/${currentBooking.id}/verify-pin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin }),
              });
              
              if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                alert(error.error === "invalid_pin" ? "Invalid PIN. Please try again." : "Failed to verify PIN");
                return;
              }
              
              // PIN verified, status changed to IN_PROGRESS
              // Navigation will be handled by RideConfirmation component
              // when driver clicks "Navigate to Dropoff" button
            } else if (currentBooking.status === "IN_PROGRESS") {
              // Complete the ride - opens documentation form
              console.log("Completing ride with ID:", currentBooking.id);
              complete(currentBooking.id);
              return; // Don't fetch bookings yet, wait for form submission
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
            // Cancel the booking - set status to CANCELED
            await fetch(`/api/bookings/${assigned.id}/status`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "CANCELED", driverId: null }),
            });
            fetchBookings();
          }}
        />
        {/* Ride Documentation Modal - Must be rendered here to appear above RideConfirmation */}
        {documentingBookingId && (
          <RideDocumentationForm
            bookingId={documentingBookingId}
            onSubmit={handleDocumentationSubmit}
            onCancel={() => setDocumentingBookingId(null)}
          />
        )}
      </>
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
    <div className="h-full flex flex-col bg-gray-50 relative">
      {/* Map Section - Full height */}
      <div className="relative flex-1 h-[calc(100vh-80px)] bg-gray-200">
        {/* Show map with driver location */}
        {driverLocation ? (
          <BookingMap
            pickup={null}
            dropoff={null}
            driverLocation={driverLocation}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center text-gray-500">
              <svg
                className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              <p className="text-xs sm:text-sm font-medium">
                Map will appear here
              </p>
            </div>
          </div>
        )}

        {/* Online Toggle - Top Left */}
        <div className="absolute top-4 left-4 z-10">
          <label className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
            <span className="text-sm font-medium text-gray-700">
              {online ? "Online" : "Offline"}
            </span>
            <input
              type="checkbox"
              checked={online}
              onChange={(e) => toggleOnline(e.target.checked)}
              className="w-11 h-6 appearance-none bg-gray-300 rounded-full relative cursor-pointer transition-colors checked:bg-[#00796B] before:content-[''] before:absolute before:w-5 before:h-5 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-5"
            />
          </label>
        </div>

        {/* Job Availability - Bottom (moved up to avoid SOS button) */}
        <div className="absolute bottom-24 left-4 right-4 z-10">
          {initialLoadRef.current ? (
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-center">
              <div className="inline-block p-2 sm:p-3 bg-gray-100 rounded-full mb-3">
                <svg
                  className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 animate-spin"
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
              <p className="text-sm text-gray-600">Loading bookings...</p>
            </div>
          ) : requestedBookings.length === 0 ? (
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-center max-w-md mx-auto">
              <div className="inline-block p-2 sm:p-3 bg-[#E0F2F1] rounded-full mb-3">
                <svg
                  className="w-8 h-8 sm:w-10 sm:h-10 text-[#00796B]"
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
              <h2 className="text-lg sm:text-xl font-bold text-[#0F3D3E] mb-2">
                No Available Jobs
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                {online
                  ? "All jobs are currently assigned. New ride requests will appear here."
                  : "Go online to start receiving ride requests"}
              </p>
              {!online && (
                <button
                  onClick={() => toggleOnline(true)}
                  className="px-5 py-2.5 bg-[#00796B] text-white rounded-lg font-semibold hover:bg-[#00695C] transition-colors text-sm"
                >
                  Go Online
                </button>
              )}
            </div>
          ) : (
            <div className="relative max-w-4xl mx-auto">
            {/* Main Carousel Container with Preview */}
            <div className="relative overflow-visible">
              <div className="flex items-center justify-center gap-2 md:gap-3">
                {/* Previous Ride Preview (Left) */}
                {requestedBookings.length > 1 && currentIndex > 0 && (
                  <div
                    onClick={goToPrevious}
                    className="hidden md:block bg-white rounded-2xl shadow-md border border-gray-300 w-[100px] shrink-0 overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="p-3 h-full flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[#00796B] rounded-full flex items-center justify-center shrink-0">
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
                          <div className="w-6 h-6 bg-[#0F3D3E] rounded-full flex items-center justify-center shrink-0">
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
                <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-500 shrink-0 transition-all duration-300 w-full md:max-w-[calc(100%-240px)]">
                  <div className="p-4 sm:p-6 md:p-10">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4 sm:mb-6 md:mb-8">
                      <span className="text-xs sm:text-sm md:text-base font-semibold text-gray-600">
                        Status
                      </span>
                      <span className="px-3 py-1 sm:px-4 sm:py-1.5 md:px-5 md:py-2 bg-yellow-100 text-yellow-700 rounded-full text-xs sm:text-sm md:text-base font-semibold">
                        {currentBooking.status}
                      </span>
                    </div>

                    {/* Route Information */}
                    <div className="space-y-3 sm:space-y-4 md:space-y-5 mb-4 sm:mb-6 md:mb-8">
                      <div className="flex items-start gap-3 sm:gap-4 md:gap-5">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[#00796B] rounded-full flex items-center justify-center shrink-0">
                          <span className="text-white font-bold text-sm sm:text-base md:text-lg">
                            A
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium mb-1 sm:mb-2">
                            Pickup
                          </p>
                          <p className="text-sm sm:text-base md:text-lg font-semibold text-[#0F3D3E] wrap-break-word leading-snug">
                            {currentBooking.pickupAddress}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 sm:gap-4 md:gap-5">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[#0F3D3E] rounded-full flex items-center justify-center shrink-0">
                          <span className="text-white font-bold text-sm sm:text-base md:text-lg">
                            B
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm text-gray-600 font-medium mb-1 sm:mb-2">
                            Dropoff
                          </p>
                          <p className="text-sm sm:text-base md:text-lg font-semibold text-[#0F3D3E] wrap-break-word leading-snug">
                            {currentBooking.dropoffAddress}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 mb-4 sm:mb-6 md:mb-8 space-y-2 sm:space-y-3">
                      {currentBooking.requiresWheelchair && (
                        <div className="flex items-center gap-2 text-xs sm:text-sm md:text-base">
                          <span className="text-2xl sm:text-3xl">♿</span>
                          <span className="font-medium text-gray-700">
                            Wheelchair accessible vehicle required
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs sm:text-sm md:text-base">
                        <span className="text-gray-600">Booking ID:</span>
                        <code className="font-mono font-medium text-gray-800">
                          {currentBooking.id.slice(0, 8)}...
                        </code>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm md:text-base">
                        <span className="text-gray-600">Requested:</span>
                        <span className="font-medium text-gray-800 text-xs sm:text-sm">
                          {new Date(currentBooking.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {currentBooking.priceEstimate && (
                        <div className="flex justify-between text-xs sm:text-sm md:text-base pt-2 sm:pt-3 border-t border-gray-200">
                          <span className="text-gray-600 text-sm sm:text-base md:text-lg">
                            Estimated Fare:
                          </span>
                          <span className="text-lg sm:text-xl md:text-2xl font-bold text-[#0F3D3E]">
                            £{currentBooking.priceEstimate.amount?.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <button
                        onClick={() => take(currentBooking.id)}
                        className="flex-1 bg-[#00796B] text-white py-3 sm:py-4 md:py-5 rounded-lg sm:rounded-xl text-sm sm:text-base md:text-lg font-semibold hover:bg-[#00695C] transition-colors"
                      >
                        Take Ride
                      </button>
                      <button
                        onClick={() => arrive(currentBooking.id)}
                        className="sm:px-6 md:px-8 py-3 sm:py-4 md:py-5 bg-gray-100 text-gray-700 rounded-lg sm:rounded-xl text-sm sm:text-base md:text-lg font-semibold hover:bg-gray-200 transition-colors"
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
                      className="w-full mt-3 sm:mt-4 text-sm sm:text-base text-[#00796B] hover:text-[#0F3D3E] font-semibold underline relative"
                    >
                      Open Chat
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 sm:-top-2 -right-1 sm:-right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center animate-pulse">
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
                      className="hidden md:block bg-white rounded-2xl shadow-md border border-gray-300 w-[100px] shrink-0 overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="p-3 h-full flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-[#00796B] rounded-full flex items-center justify-center shrink-0">
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
                            <div className="w-6 h-6 bg-[#0F3D3E] rounded-full flex items-center justify-center shrink-0">
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
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  className="p-3 rounded-full bg-white shadow-md border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors z-10"
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
                  className="p-3 rounded-full bg-white shadow-md border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors z-10"
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
        </div>

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


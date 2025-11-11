"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import ChatWidget from "@/components/ChatWidget";
import MapboxAutocomplete from "@/components/MapboxAutocomplete";
import BookingMap from "@/components/BookingMap";
import AppLayout from "@/components/AppLayout";
import { getChannel } from "@/lib/realtime/ably";
import RoleGate from "@/components/RoleGate";
import RideConfirmation from "@/components/RideConfirmation";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import RiderRatingModal from "@/components/RiderRatingModal";
import dynamic from "next/dynamic";

// Dynamically import mapbox to avoid SSR issues
const FindingDriverMap = dynamic(() => import("@/components/FindingDriverMap"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-gray-500">Loading map...</div>
    </div>
  ),
});

// Component to handle each active booking card with unread tracking
function ActiveBookingCard({
  booking,
  onCancelBooking,
  onOpenChat,
}: {
  booking: any;
  onCancelBooking: (id: string) => void;
  onOpenChat: (id: string) => void;
}) {
  const { unreadCount, markAsRead } = useUnreadMessages(booking.id, "RIDER");

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                booking.status === "REQUESTED"
                  ? "bg-amber-100 text-amber-700"
                  : booking.status === "EN_ROUTE"
                  ? "bg-blue-100 text-blue-700"
                  : booking.status === "ARRIVED"
                  ? "bg-green-100 text-green-700"
                  : booking.status === "IN_PROGRESS"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {booking.status === "REQUESTED"
                ? "Finding Driver..."
                : booking.status.replace("_", " ")}
            </span>
          </div>
          <div className="text-sm text-gray-900 font-medium">
            {booking.dropoffAddress.split(",")[0]}
          </div>
          <div className="text-xs text-gray-500">
            {booking.dropoffAddress.split(",").slice(1).join(",")}
          </div>
        </div>
      </div>

      {/* Driver Arrived Banner */}
      {booking.status === "ARRIVED" && booking.driver && (
        <div className="mb-3 p-4 bg-gradient-to-r from-[#00796B] to-[#00695C] rounded-xl text-white shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div className="flex-1">
              <div className="font-bold text-sm">
                {booking.driver.user?.name || "Your driver"} is waiting outside!
              </div>
              <div className="text-xs text-white/90">
                Provide your pickup PIN below
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PIN Display - More prominent when ARRIVED */}
      {booking.pinCode && booking.status !== "IN_PROGRESS" && !booking.pickupVerified && (
        <div className={`mt-4 p-5 ${booking.status === "ARRIVED" ? "bg-yellow-50 border-4 border-yellow-400 shadow-xl animate-bounce" : "bg-[#E0F2F1] border-2 border-[#00796B]"} rounded-xl text-center`}>
          <div className={`text-sm ${booking.status === "ARRIVED" ? "text-yellow-800" : "text-[#00796B]"} font-semibold mb-2`}>
            {booking.status === "ARRIVED" ? "🔔 PROVIDE THIS PIN TO YOUR DRIVER" : "Your Pickup PIN"}
          </div>
          <div className={`text-4xl font-bold ${booking.status === "ARRIVED" ? "text-yellow-900" : "text-[#0F3D3E]"} tracking-wider`}>
            {booking.pinCode}
          </div>
          <div className={`text-xs ${booking.status === "ARRIVED" ? "text-yellow-700 font-medium" : "text-gray-600"} mt-2`}>
            {booking.status === "ARRIVED" ? "Driver is waiting - share this PIN now!" : "Share this with your driver"}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
        {booking.status !== "IN_PROGRESS" && (
          <button
            onClick={() => onCancelBooking(booking.id)}
            className="w-full sm:flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-red-50 text-red-600 border-2 border-red-200 rounded-lg sm:rounded-xl hover:bg-red-100 transition-colors font-semibold"
          >
            Cancel Ride
          </button>
        )}
        <button
          onClick={() => {
            markAsRead();
            onOpenChat(booking.id);
          }}
          className="w-full sm:flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-[#00796B] text-white rounded-lg sm:rounded-xl hover:bg-[#00695C] transition-colors font-semibold relative"
        >
          Open Chat
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 sm:h-6 sm:w-6 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

function RiderPageContent() {
  const { user } = useUser();
  const router = useRouter();
  const fetchingRef = useRef(false);
  const previousBookingsRef = useRef<any[]>([]);
  const pickupCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const dropoffCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const [pickup, setPickup] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [dropoff, setDropoff] = useState("");
  const [dropoffCoords, setDropoffCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [wheelchair, setWheelchair] = useState(false);
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null
  );
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [findingAnotherDriver, setFindingAnotherDriver] = useState(false);
  const [cancelledBookingId, setCancelledBookingId] = useState<string | null>(null);
  const [editingPickup, setEditingPickup] = useState(false);
  const [ratingBookingId, setRatingBookingId] = useState<string | null>(null);

  // Track unread messages for the active chat
  const { markAsRead } = useUnreadMessages(activeBookingId || "", "RIDER");

  // Get recent destinations (last 3 unique dropoff addresses) - MUST be before any early returns
  const recentDestinations = useMemo(() => {
    const completed = bookings
      .filter((b: any) => b.status === "COMPLETED")
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const uniqueDestinations = new Map();
    completed.forEach((b: any) => {
      if (!uniqueDestinations.has(b.dropoffAddress)) {
        uniqueDestinations.set(b.dropoffAddress, b);
      }
    });

    return Array.from(uniqueDestinations.values()).slice(0, 3);
  }, [bookings]);

  // Get current location on mount to show map
  useEffect(() => {
    if (navigator.geolocation && !pickupCoords) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const coords = { lat: latitude, lng: longitude };
          pickupCoordsRef.current = coords;
          setPickupCoords(coords);

          // Optionally reverse geocode to get address
          try {
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
            );
            const data = await response.json();
            if (data.features && data.features.length > 0) {
              setPickup(data.features[0].place_name);
            }
          } catch (error) {
            console.error("Error getting address:", error);
          }
        },
        (error) => {
          console.warn("Could not get current location:", error);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
  }, []); // Only run once on mount

  // Memoized fetch function to prevent re-creating on every render
  const fetchBookings = useCallback(async () => {
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    try {
      const res = await fetch("/api/bookings");
      const data = await res.json();
      const myBookings = data.filter((b: any) => b.riderId === user?.id);

      // Check if any booking went from ASSIGNED/EN_ROUTE/ARRIVED back to REQUESTED (driver cancelled)
      const previousBookings = previousBookingsRef.current;
      
      // Process bookings sequentially to handle async operations
      for (const newBooking of myBookings) {
        const oldBooking = previousBookings.find(
          (b: any) => b.id === newBooking.id
        );

        console.log("Checking booking:", {
          bookingId: newBooking.id,
          oldStatus: oldBooking?.status,
          newStatus: newBooking.status,
          oldDriverId: oldBooking?.driverId,
          newDriverId: newBooking.driverId,
        });

        // Check if driver cancelled (driverId was set but is now null, and status is CANCELED)
        if (
          oldBooking &&
          (oldBooking.status === "ASSIGNED" ||
            oldBooking.status === "EN_ROUTE" ||
            oldBooking.status === "ARRIVED") &&
          newBooking.status === "CANCELED" &&
          oldBooking.driverId && // Had a driver before
          !newBooking.driverId // Driver is now null (driver cancelled)
        ) {
          // Driver cancelled! Show the "finding another driver" screen
          console.log("🚨 Driver cancelled ride:", newBooking.id);
          setCancelledBookingId(newBooking.id);
          setFindingAnotherDriver(true);

          // After 5 seconds, set booking back to REQUESTED and hide the screen
          setTimeout(async () => {
            console.log("Setting booking back to REQUESTED and hiding finding another driver screen");
            try {
              // Set booking status back to REQUESTED so it can be assigned to another driver
              await fetch(`/api/bookings/${newBooking.id}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "REQUESTED", driverId: null }),
              });
              // Refresh bookings to get updated status
              const res = await fetch("/api/bookings");
              const data = await res.json();
              const myBookings = data.filter((b: any) => b.riderId === user?.id);
              setBookings(myBookings);
            } catch (error) {
              console.error("Error resetting booking status:", error);
            }
            setFindingAnotherDriver(false);
            setCancelledBookingId(null);
          }, 5000);
        }
        // If rider cancelled (status is CANCELED but driverId didn't change to null), 
        // just let it cancel normally - no special screen needed

        // Check if driver has arrived (status changed to ARRIVED)
        if (
          oldBooking &&
          oldBooking.status !== "ARRIVED" &&
          newBooking.status === "ARRIVED"
        ) {
          // Driver has arrived! Show notification
          console.log("🚗 Driver has arrived for booking:", newBooking.id);
          
          // Play notification sound immediately
          (async () => {
            try {
              const { playNotificationSound } = await import("@/lib/notifications/sound");
              playNotificationSound();
            } catch (error) {
              console.error("Error playing notification sound:", error);
            }
          })();
          
          // Flash tab title immediately
          (async () => {
            try {
              const { updateTabTitleCount } = await import("@/lib/notifications/tabTitle");
              updateTabTitleCount(1); // Use 1 to indicate driver arrived
            } catch (error) {
              console.error("Error updating tab title:", error);
            }
          })();
          
          // Show browser notification
          if ("Notification" in window) {
            if (Notification.permission === "granted") {
              const driverName = newBooking.driver?.user?.name || "Your driver";
              const notification = new Notification("Driver Has Arrived!", {
                body: `${driverName} is waiting outside. Please provide your pickup PIN.`,
                icon: "/favicon.ico",
                tag: `driver-arrived-${newBooking.id}`,
                requireInteraction: false,
                badge: "/favicon.ico",
              });

              setTimeout(() => {
                notification.close();
              }, 10000); // Show for 10 seconds

              notification.onclick = () => {
                window.focus();
                notification.close();
              };
            } else if (Notification.permission === "default") {
              // Request permission if not yet asked
              Notification.requestPermission().then((permission) => {
                if (permission === "granted") {
                  const driverName = newBooking.driver?.user?.name || "Your driver";
                  const notification = new Notification("Driver Has Arrived!", {
                    body: `${driverName} is waiting outside. Please provide your pickup PIN.`,
                    icon: "/favicon.ico",
                    tag: `driver-arrived-${newBooking.id}`,
                    requireInteraction: false,
                    badge: "/favicon.ico",
                  });

                  setTimeout(() => {
                    notification.close();
                  }, 10000);

                  notification.onclick = () => {
                    window.focus();
                    notification.close();
                  };
                }
              });
            }
          }
          
          // Ensure the booking is selected so rider can see the PIN
          setSelectedBookingId(newBooking.id);
        }

        // Check if booking was just completed and needs rating
        if (
          oldBooking &&
          oldBooking.status !== "COMPLETED" &&
          newBooking.status === "COMPLETED"
        ) {
          // Check if rating already exists
          try {
            const ratingRes = await fetch(
              `/api/riders/ratings?bookingId=${newBooking.id}`
            );
            if (!ratingRes.ok) {
              // No rating exists, show rating modal
              console.log("Ride completed, showing rating modal for:", newBooking.id);
              setRatingBookingId(newBooking.id);
            }
          } catch (error) {
            // Error checking rating, show modal anyway
            console.log("Error checking rating, showing modal for:", newBooking.id);
            setRatingBookingId(newBooking.id);
          }
        }
      }

      // Update the ref for next comparison
      previousBookingsRef.current = myBookings;
      setBookings(myBookings);

      // Auto-select most recent active booking
      const active = myBookings.find(
        (b: any) => b.status !== "COMPLETED" && b.status !== "CANCELED"
      );
      if (active && !selectedBookingId) {
        setSelectedBookingId(active.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      fetchingRef.current = false;
    }
  }, [user?.id, selectedBookingId]);

  useEffect(() => {
    if (!user?.id) return;

    fetchBookings();

    // Subscribe to real-time updates for all rider bookings
    let channel: any = null;
    let subscribed = false;
    let handler: any = null;

    try {
      channel = getChannel(`rider:${user.id}`);
      handler = () => fetchBookings();

      if (
        channel &&
        !channel.isMock &&
        typeof channel.subscribe === "function"
      ) {
        channel.subscribe(handler);
        subscribed = true;
      }
    } catch {
      console.warn("Ably subscription failed");
    }

    // Add polling fallback to ensure updates even without Ably
    const timer = setInterval(fetchBookings, 10000); // Poll every 10 seconds

    return () => {
      clearInterval(timer);
      try {
        if (
          subscribed &&
          channel &&
          handler &&
          typeof channel.unsubscribe === "function"
        ) {
          channel.unsubscribe(handler);
        }
      } catch (error) {
        console.warn("Cleanup error:", error);
      }
    };
  }, [user?.id, fetchBookings]);

  async function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return Promise.reject("Geolocation not supported");
    }

    setLoadingLocation(true);

    return new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Reverse geocode to get address from coordinates
            const response = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
            );
            const data = await response.json();

            if (data.features && data.features.length > 0) {
              const address = data.features[0].place_name;
              const coords = { lat: latitude, lng: longitude };
              pickupCoordsRef.current = coords;
              setPickup(address);
              setPickupCoords(coords);
            }
          } catch (error) {
            console.error("Error reverse geocoding:", error);
            // Still set coordinates even if reverse geocoding fails
            const coords = { lat: latitude, lng: longitude };
            pickupCoordsRef.current = coords;
            setPickup(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            setPickupCoords(coords);
          } finally {
            setLoadingLocation(false);
            resolve();
          }
        },
        (error) => {
          setLoadingLocation(false);
          let message = "Unable to retrieve your location";

          switch (error.code) {
            case error.PERMISSION_DENIED:
              message =
                "Location access denied. Please enable location services in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Location information unavailable";
              break;
            case error.TIMEOUT:
              message = "Location request timed out";
              break;
          }

          alert(message);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  async function handleEstimate() {
    // Use refs as fallback if state hasn't updated yet
    const currentPickupCoords = pickupCoords || pickupCoordsRef.current;
    const currentDropoffCoords = dropoffCoords || dropoffCoordsRef.current;
    
    // Validate pickup
    if (!pickup) {
      alert("Please select a pickup location");
      return;
    }
    
    if (!currentPickupCoords || 
        currentPickupCoords.lat === 0 || 
        currentPickupCoords.lat === null || 
        currentPickupCoords.lat === undefined ||
        currentPickupCoords.lng === 0 || 
        currentPickupCoords.lng === null || 
        currentPickupCoords.lng === undefined) {
      alert("Pickup location coordinates are invalid. Please select your pickup location again.");
      return;
    }
    
    // Validate dropoff
    if (!dropoff) {
      alert("Please select a dropoff location");
      return;
    }
    
    if (!currentDropoffCoords || 
        currentDropoffCoords.lat === 0 || 
        currentDropoffCoords.lat === null || 
        currentDropoffCoords.lat === undefined ||
        currentDropoffCoords.lng === 0 || 
        currentDropoffCoords.lng === null || 
        currentDropoffCoords.lng === undefined) {
      alert("Dropoff location coordinates are invalid. Please select your dropoff location again.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup: currentPickupCoords,
          dropoff: currentDropoffCoords,
          requiresWheelchair: wheelchair,
        }),
      });
      const data = await res.json();
      setEstimate(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleBook() {
    if (!user) {
      alert("Please sign in to book a ride");
      return;
    }

    // Use refs as fallback if state hasn't updated yet
    const currentPickupCoords = pickupCoords || pickupCoordsRef.current;
    const currentDropoffCoords = dropoffCoords || dropoffCoordsRef.current;

    if (!currentPickupCoords || !currentDropoffCoords) {
      alert("Please select valid pickup and dropoff locations");
      return;
    }

    // Redirect to payment page with booking details
    const params = new URLSearchParams({
      pickup: pickup,
      dropoff: dropoff,
      pickupLat: currentPickupCoords.lat.toString(),
      pickupLng: currentPickupCoords.lng.toString(),
      dropoffLat: currentDropoffCoords.lat.toString(),
      dropoffLng: currentDropoffCoords.lng.toString(),
      amount: estimate.amount.toString(),
      distanceKm: estimate.distanceKm.toString(),
      wheelchair: wheelchair.toString(),
    });

    router.push(`/rider/payment?${params.toString()}`);
  }

  // Debug logging for coordinates (must be before any early returns)
  useEffect(() => {
    console.log("Rider page coordinates:", {
      pickup,
      pickupCoords,
      dropoff,
      dropoffCoords,
    });
  }, [pickup, pickupCoords, dropoff, dropoffCoords]);

  async function handleCancelBooking(bookingId: string) {
    const booking = bookings.find((b) => b.id === bookingId);
    const hasPayment = booking?.paymentIntentId;
    const canRefund = booking?.status === "REQUESTED" || booking?.status === "ASSIGNED";
    
    const confirmMessage = hasPayment && canRefund
      ? "Are you sure you want to cancel this ride? Your payment will be refunded."
      : "Are you sure you want to cancel this ride?";
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELED" }),
      });

      if (res.ok) {
        await fetchBookings();
        if (hasPayment && canRefund) {
          alert("Ride cancelled. Your refund is being processed and will appear in your account within 5-10 business days.");
        } else {
          alert("Ride cancelled successfully.");
        }
      } else {
        alert("Failed to cancel booking");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to cancel booking");
    }
  }

  // Check if there's a pending booking (REQUESTED status)
  const pendingBooking = bookings.find((b) => b.status === "REQUESTED");

  // Check if current booking has driver assigned (show confirmation screen)
  const activeBooking = bookings.find(
    (b) =>
      b.status === "ASSIGNED" ||
      b.status === "EN_ROUTE" ||
      b.status === "ARRIVED" ||
      b.status === "IN_PROGRESS"
  );

  // Find the cancelled booking to show details
  const cancelledBooking = cancelledBookingId 
    ? bookings.find((b) => b.id === cancelledBookingId)
    : null;

  // Show "Finding Another Driver" screen when driver cancels
  if (findingAnotherDriver && cancelledBooking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-orange-500">
            {/* Header */}
            <div className="text-center mb-4">
              <div className="inline-block p-2 bg-orange-100 rounded-full mb-3">
                <svg
                  className="w-8 h-8 text-orange-600 animate-spin"
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
              <h2 className="text-xl font-bold text-[#0F3D3E] mb-1">
                Finding Another Driver
              </h2>
              <p className="text-sm text-gray-600">
                Your previous driver cancelled. We're matching you with another
                nearby driver...
              </p>
            </div>

            {/* Booking Details - Minimal */}
            <div className="bg-orange-50 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-[#00796B] rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-xs">A</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 font-medium">Pickup</p>
                  <p className="text-sm font-semibold text-[#0F3D3E] truncate">
                    {cancelledBooking.pickupAddress.split(",")[0]}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-[#0F3D3E] rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-xs">B</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 font-medium">Dropoff</p>
                  <p className="text-sm font-semibold text-[#0F3D3E] truncate">
                    {cancelledBooking.dropoffAddress.split(",")[0]}
                  </p>
                </div>
              </div>
            </div>

            {/* Loading Animation */}
            <div className="flex justify-center mb-4">
              <div className="flex space-x-2">
                <div
                  className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => {
                if (cancelledBooking) {
                  handleCancelBooking(cancelledBooking.id);
                }
              }}
              className="w-full px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-semibold text-sm"
            >
              Cancel Ride
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading screen for pending booking
  if (pendingBooking) {
    return (
      <FindingDriverMap
        pickupLat={pendingBooking.pickupLat}
        pickupLng={pendingBooking.pickupLng}
        pickupAddress={pendingBooking.pickupAddress}
      >
        <div className="max-w-md w-full relative z-10">
          <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-blue-500">
            {/* Header */}
            <div className="text-center mb-4">
              <div className="inline-block p-2 bg-yellow-100 rounded-full mb-3">
                <svg
                  className="w-8 h-8 text-yellow-600 animate-pulse"
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
              </div>
              <h2 className="text-xl font-bold text-[#0F3D3E] mb-1">
                Finding Your Driver
              </h2>
              <p className="text-sm text-gray-600">
                Please wait while we match you with a nearby driver...
              </p>
            </div>

            {/* Booking Details */}
            <div className="bg-blue-50 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700">
                  Status
                </span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                  {pendingBooking.status}
                </span>
              </div>

              <div className="border-t border-blue-200 pt-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-[#00796B] rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-xs">A</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 font-medium">Pickup</p>
                    <p className="text-sm font-semibold text-[#0F3D3E] truncate">
                      {pendingBooking.pickupAddress}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 bg-[#0F3D3E] rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-xs">B</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 font-medium">Dropoff</p>
                    <p className="text-sm font-semibold text-[#0F3D3E] truncate">
                      {pendingBooking.dropoffAddress}
                    </p>
                  </div>
                </div>
              </div>

              {pendingBooking.pinCode && (
                <div className="border-t border-blue-200 pt-3">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600">Your PIN:</p>
                    <p className="text-2xl font-bold text-[#00796B] tracking-wider">
                      {pendingBooking.pinCode}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Give this to your driver
                    </p>
                  </div>
                </div>
              )}

              {pendingBooking.priceEstimate && (
                <div className="border-t border-blue-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">
                      Estimated Fare
                    </span>
                    <span className="text-lg font-bold text-[#0F3D3E]">
                      £{pendingBooking.priceEstimate.amount?.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="text-center text-xs text-gray-500 pt-2">
                Requested: {new Date(pendingBooking.createdAt).toLocaleString()}
              </div>
            </div>

            {/* Loading Animation */}
            <div className="flex justify-center mb-4">
              <div className="flex space-x-2">
                <div
                  className="w-2 h-2 bg-[#00796B] rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-[#00796B] rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-[#00796B] rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => handleCancelBooking(pendingBooking.id)}
              className="w-full px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-semibold text-sm"
            >
              Cancel Ride
            </button>
          </div>
        </div>
      </FindingDriverMap>
    );
  }

  // Show confirmation screen if driver accepted
  if (activeBooking && activeBooking.driverId) {
    return (
      <RideConfirmation
        booking={activeBooking}
        userRole="RIDER"
        onConfirm={async () => {
          // Handle ride confirmation
          alert("Ride confirmed! Driver is on the way.");
        }}
        onCancel={async () => {
          await handleCancelBooking(activeBooking.id);
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 relative">
      {/* Map Section - Full height */}
      <div className="relative flex-1 h-[calc(100vh-80px)] bg-gray-200">
        {(pickupCoords || dropoffCoords) && (
          <BookingMap
            pickup={pickupCoords}
            dropoff={dropoffCoords}
            className="w-full h-full"
          />
        )}
        {!pickupCoords && !dropoffCoords && (
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

        {/* Where to Search Box - Overlay on Map (Mobile) */}
        <div className="md:hidden absolute top-4 left-4 right-4 z-10">
          <div className="bg-white rounded-2xl p-4 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-gray-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <div className="flex-1">
                <MapboxAutocomplete
                  value={dropoff}
                  onChange={(address, coords) => {
                    dropoffCoordsRef.current = coords;
                    setDropoff(address);
                    setDropoffCoords(coords);
                    // Auto-get current location for pickup if not set
                    if (!pickup) {
                      handleUseCurrentLocation();
                    }
                  }}
                  placeholder="Where to?"
                  label=""
                  required={false}
                />
              </div>
              <button
                onClick={() => {
                  alert("Schedule ride feature coming soon!");
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shrink-0"
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="hidden sm:inline">Later</span>
              </button>
            </div>

            {/* Wheelchair Checkbox - Mobile */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <input
                type="checkbox"
                id="wheelchair-mobile"
                checked={wheelchair}
                onChange={(e) => setWheelchair(e.target.checked)}
                className="w-4 h-4 text-[#00796B] rounded border-gray-300 focus:ring-[#00796B]"
              />
              <label
                htmlFor="wheelchair-mobile"
                className="text-sm text-gray-700 flex items-center gap-1"
              >
                <span className="text-lg">♿</span>
                <span>Wheelchair accessible</span>
              </label>
            </div>
          </div>
        </div>

        {/* Where to Search Box & Recent Destinations - Desktop (Bottom Overlay) */}
        {!booking && (
          <div className="hidden md:block absolute bottom-4 left-4 right-4 z-10 max-w-2xl mx-auto">
            <div className="space-y-3">
              {/* Where to Search Box */}
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
                <div className="flex items-center gap-4">
                  <svg
                    className="w-6 h-6 text-gray-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <div className="flex-1">
                    <MapboxAutocomplete
                      value={dropoff}
                      onChange={(address, coords) => {
                        setDropoff(address);
                        setDropoffCoords(coords);
                        // Auto-get current location for pickup if not set
                        if (!pickup) {
                          handleUseCurrentLocation();
                        }
                      }}
                      placeholder="Where to?"
                      label=""
                      required={false}
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="checkbox"
                      id="wheelchair-desktop"
                      checked={wheelchair}
                      onChange={(e) => setWheelchair(e.target.checked)}
                      className="w-4 h-4 text-[#00796B] rounded border-gray-300 focus:ring-[#00796B]"
                    />
                    <label
                      htmlFor="wheelchair-desktop"
                      className="text-sm text-gray-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span className="text-lg">♿</span>
                      <span>Wheelchair</span>
                    </label>
                  </div>
                  <button
                    onClick={() => {
                      alert("Schedule ride feature coming soon!");
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors shrink-0"
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
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Later
                  </button>
                </div>
              </div>

              {/* Recent Destinations - Desktop (only show when no destination selected) */}
              {!dropoff && recentDestinations.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 space-y-2">
                  {recentDestinations.map((destination: any) => (
                    <button
                      key={destination.id}
                      onClick={async () => {
                        try {
                          // Set dropoff address first
                          setDropoff(destination.dropoffAddress);
                          
                          let dropoffCoordsValue: { lat: number; lng: number } | null = null;

                          // Check if destination has coordinates, if not geocode the address
                          if (destination.dropoffLat && destination.dropoffLng && 
                              destination.dropoffLat !== 0 && destination.dropoffLng !== 0) {
                            // Use existing coordinates
                            dropoffCoordsValue = {
                              lat: destination.dropoffLat,
                              lng: destination.dropoffLng,
                            };
                          } else {
                            // Geocode the address to get coordinates
                            const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
                            const response = await fetch(
                              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination.dropoffAddress)}.json?access_token=${token}&limit=1`
                            );
                            const data = await response.json();
                            
                            if (data.features && data.features.length > 0) {
                              const [lng, lat] = data.features[0].center;
                              dropoffCoordsValue = { lat, lng };
                            } else {
                              alert("Could not find coordinates for this destination. Please select it from the search instead.");
                              return;
                            }
                          }

                          // Set coordinates in both ref and state immediately
                          dropoffCoordsRef.current = dropoffCoordsValue;
                          setDropoffCoords(dropoffCoordsValue);

                          // Get current location for pickup if not already set
                          if (!pickup || !pickupCoords) {
                            try {
                              await handleUseCurrentLocation();
                            } catch (error) {
                              console.error("Failed to get current location:", error);
                              // Still try to estimate if we have dropoff coords
                            }
                          }

                          // Wait a bit for state to update, then trigger estimate
                          // Use refs to get the latest coordinate values (not stale closure)
                          setTimeout(() => {
                            const currentPickup = pickupCoordsRef.current;
                            const currentDropoff = dropoffCoordsRef.current;

                            console.log("Checking coordinates for estimate:", {
                              pickup: currentPickup,
                              dropoff: currentDropoff,
                              pickupState: pickupCoords,
                              dropoffState: dropoffCoords,
                            });

                            if (
                              currentPickup &&
                              currentDropoff &&
                              currentPickup.lat !== 0 &&
                              currentPickup.lat !== null &&
                              currentPickup.lat !== undefined &&
                              currentPickup.lng !== 0 &&
                              currentPickup.lng !== null &&
                              currentPickup.lng !== undefined &&
                              currentDropoff.lat !== 0 &&
                              currentDropoff.lat !== null &&
                              currentDropoff.lat !== undefined &&
                              currentDropoff.lng !== 0 &&
                              currentDropoff.lng !== null &&
                              currentDropoff.lng !== undefined
                            ) {
                              // Ensure state is also updated before calling handleEstimate
                              if (!pickupCoords) {
                                setPickupCoords(currentPickup);
                              }
                              if (!dropoffCoords) {
                                setDropoffCoords(currentDropoff);
                              }
                              handleEstimate();
                            } else {
                              console.warn("Coordinates not ready yet:", {
                                pickup: currentPickup,
                                dropoff: currentDropoff,
                              });
                              alert("Please wait for location to load, or select locations manually.");
                            }
                          }, 1000);
                        } catch (error) {
                          console.error("Error selecting recent destination:", error);
                          alert("An error occurred. Please try selecting the destination from the search instead.");
                        }
                      }}
                      className="w-full bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-[#00796B] hover:shadow-md transition-all text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shrink-0 group-hover:bg-[#E0F2F1] transition-colors">
                          <svg
                            className="w-6 h-6 text-gray-600 group-hover:text-[#00796B]"
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
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {destination.dropoffAddress.split(",")[0]}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {destination.dropoffAddress
                              .split(",")
                              .slice(1)
                              .join(",")}
                          </p>
                        </div>
                        <svg
                          className="w-5 h-5 text-gray-400 shrink-0"
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
                    </button>
                  ))}
                </div>
              )}

              {/* Estimate and Booking Buttons - Desktop (show when destination selected) */}
              {dropoff && dropoffCoords && (
                <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100 space-y-3">
                  {!estimate && pickup && pickupCoords && (
                    <button
                      onClick={handleEstimate}
                      disabled={
                        loading ||
                        pickupCoords?.lat === 0 ||
                        dropoffCoords?.lat === 0
                      }
                      className="w-full bg-[#00796B] text-white py-3 rounded-xl font-semibold text-base hover:bg-[#00695C] transition-colors disabled:opacity-50"
                    >
                      {loading ? "Estimating..." : "Get Estimate"}
                    </button>
                  )}

                  {estimate && (
                    <div className="space-y-3">
                      <div className="bg-[#E0F2F1] rounded-xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-700">
                            Estimated Fare
                          </span>
                          <span className="font-bold text-2xl text-[#0F3D3E]">
                            £{estimate.amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Distance: ~{estimate.distanceKm.toFixed(1)} km
                        </div>
                      </div>
                      <button
                        onClick={handleBook}
                        disabled={loading}
                        className="w-full bg-[#00796B] text-white py-3 rounded-xl font-semibold text-base hover:bg-[#00695C] transition-colors"
                      >
                        {loading ? "Booking..." : "Confirm Booking"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Sheet - Shown when destination selected */}
      {dropoff && dropoffCoords && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl border-t border-gray-200 z-20 animate-slide-up">
          <div className="p-4 space-y-3">
            {/* Handle Bar */}
            <div className="flex justify-center">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            </div>

            {/* Pickup Location Confirmation */}
            <div className="space-y-2 pb-3 border-b border-gray-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[#00796B] rounded-full flex items-center justify-center shrink-0 mt-1">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 font-medium mb-1">
                    Pick up
                  </p>
                  {!pickup || !pickupCoords ? (
                    <button
                      onClick={handleUseCurrentLocation}
                      disabled={loadingLocation}
                      className="flex items-center gap-2 text-sm text-[#00796B] hover:text-[#0F3D3E] font-medium disabled:opacity-50"
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
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      {loadingLocation
                        ? "Getting location..."
                        : "Use my location"}
                    </button>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[#0F3D3E] wrap-break-word">
                        {pickup}
                      </p>
                      <button
                        onClick={() => setEditingPickup(true)}
                        className="text-xs text-[#00796B] hover:text-[#0F3D3E] font-medium"
                      >
                        Edit location
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Destination Info */}
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[#0F3D3E] rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">B</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 font-medium">Going to</p>
                  <p className="text-sm font-semibold text-[#0F3D3E] wrap-break-word">
                    {dropoff}
                  </p>
                </div>
              </div>
            </div>

            {/* Estimate or Confirm Button */}
            {!estimate && pickup && pickupCoords && (
              <button
                onClick={handleEstimate}
                disabled={loading}
                className="w-full bg-[#00796B] text-white py-4 rounded-xl font-semibold text-base hover:bg-[#00695C] transition-colors disabled:opacity-50"
              >
                {loading ? "Estimating..." : "See Prices"}
              </button>
            )}

            {estimate && (
              <div className="space-y-3">
                <div className="bg-[#E0F2F1] rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-700">
                      Estimated Fare
                    </span>
                    <span className="font-bold text-2xl text-[#0F3D3E]">
                      £{estimate.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Distance: ~{estimate.distanceKm.toFixed(1)} km
                  </div>
                </div>
                <button
                  onClick={handleBook}
                  disabled={loading}
                  className="w-full bg-[#00796B] text-white py-4 rounded-xl font-semibold text-base hover:bg-[#00695C] transition-colors"
                >
                  {loading ? "Booking..." : "Confirm Booking"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Booking Display (only shown if there's an active booking) */}
      {bookings.filter(
        (b: any) => b.status !== "COMPLETED" && b.status !== "CANCELED"
      ).length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl">
          <div className="max-w-2xl mx-auto p-6">
            {bookings
              .filter(
                (b: any) => b.status !== "COMPLETED" && b.status !== "CANCELED"
              )
              .map((b: any) => (
                <ActiveBookingCard
                  key={b.id}
                  booking={b}
                  onCancelBooking={handleCancelBooking}
                  onOpenChat={setActiveBookingId}
                />
              ))}
          </div>
        </div>
      )}

      {/* Edit Pickup Modal */}
      {editingPickup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#0F3D3E]">
                Edit Pickup Location
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Adjust your pickup location if needed (e.g., door number)
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Address
                </label>
                <MapboxAutocomplete
                  value={pickup}
                  onChange={(address, coords) => {
                    pickupCoordsRef.current = coords;
                    setPickup(address);
                    setPickupCoords(coords);
                  }}
                  placeholder="Enter pickup location"
                  label=""
                  required
                />
              </div>
              <button
                onClick={handleUseCurrentLocation}
                disabled={loadingLocation}
                className="w-full flex items-center justify-center gap-2 text-sm text-[#00796B] hover:text-[#0F3D3E] font-medium disabled:opacity-50 py-2 border border-[#00796B] rounded-lg hover:bg-[#E0F2F1] transition-colors"
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
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {loadingLocation
                  ? "Getting location..."
                  : "Use my current location"}
              </button>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setEditingPickup(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pickup && pickupCoords) {
                    setEditingPickup(false);
                    // Clear estimate to force re-estimation with new pickup
                    setEstimate(null);
                  }
                }}
                disabled={!pickup || !pickupCoords}
                className="flex-1 px-4 py-3 bg-[#00796B] text-white rounded-lg font-semibold hover:bg-[#00695C] transition-colors disabled:opacity-50"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {activeBookingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0F3D3E]">
                Chat with Driver
              </h2>
              <button
                onClick={() => setActiveBookingId(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
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
              <ChatWidget
                key={activeBookingId}
                bookingId={activeBookingId}
                sender="RIDER"
                onMarkAsRead={markAsRead}
              />
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingBookingId && (() => {
        const bookingToRate = bookings.find((b: any) => b.id === ratingBookingId);
        if (!bookingToRate) return null;
        
        return (
          <RiderRatingModal
            bookingId={ratingBookingId}
            driverName={bookingToRate.driver?.user?.name || "Driver"}
            onSubmit={async (ratingData) => {
              try {
                const res = await fetch("/api/riders/ratings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    bookingId: ratingBookingId,
                    ...ratingData,
                  }),
                });

                // Log response for debugging
                console.log("Rating API response:", {
                  status: res.status,
                  ok: res.ok,
                  statusText: res.statusText,
                });

                // Check if response is successful (200-299 range)
                if (res.status >= 200 && res.status < 300) {
                  // Success - try to parse response, but don't fail if parsing fails
                  try {
                    const data = await res.json();
                    console.log("Rating submitted successfully:", data);
                  } catch (parseError) {
                    // Even if JSON parsing fails, if status is success, consider it a success
                    console.log("Rating submitted successfully (could not parse response body)");
                  }
                  
                  // Close modal and refresh regardless of parsing result
                  setRatingBookingId(null);
                  setTimeout(async () => {
                    await fetchBookings();
                  }, 500);
                  return;
                }

                // Handle error response
                let errorMessage = "Failed to submit rating";
                try {
                  const errorData = await res.json();
                  errorMessage = errorData?.error || errorMessage;
                } catch {
                  // If JSON parsing fails, use status text
                  errorMessage = res.statusText || `Server returned ${res.status}`;
                }
                throw new Error(errorMessage);
              } catch (error) {
                console.error("Failed to submit rating:", error);
                // Even if there's an error, check if rating might have been saved
                // by checking if the booking has a rating after a delay
                const bookingIdToCheck = ratingBookingId;
                setTimeout(async () => {
                  try {
                    const checkRes = await fetch(`/api/riders/ratings?bookingId=${bookingIdToCheck}`);
                    if (checkRes.ok) {
                      const existingRating = await checkRes.json();
                      if (existingRating && !existingRating.error) {
                        console.log("Rating was actually saved despite error - closing modal");
                        setRatingBookingId(null);
                        await fetchBookings();
                      }
                    }
                  } catch (checkError) {
                    console.error("Error checking if rating was saved:", checkError);
                  }
                }, 1000);
                throw error;
              }
            }}
            onCancel={() => setRatingBookingId(null)}
          />
        );
      })()}
    </div>
  );
}

export default function RiderPage() {
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
    <RoleGate requiredRole={["RIDER"]}>
      <AppLayout userRole="RIDER" isAdmin={isAdmin}>
        <RiderPageContent />
      </AppLayout>
    </RoleGate>
  );
}

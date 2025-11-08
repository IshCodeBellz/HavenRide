"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import ChatWidget from "@/components/ChatWidget";
import MapboxAutocomplete from "@/components/MapboxAutocomplete";
import BookingMap from "@/components/BookingMap";
import AppLayout from "@/components/AppLayout";
import { getChannel } from "@/lib/realtime/ably";
import RoleGate from "@/components/RoleGate";
import RideConfirmation from "@/components/RideConfirmation";

function RiderPageContent() {
  const { user } = useUser();
  const fetchingRef = useRef(false);
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

  // Memoized fetch function to prevent re-creating on every render
  const fetchBookings = useCallback(async () => {
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    try {
      const res = await fetch("/api/bookings");
      const data = await res.json();
      const myBookings = data.filter((b: any) => b.riderId === user?.id);
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
      return;
    }

    setLoadingLocation(true);
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
            setPickup(address);
            setPickupCoords({ lat: latitude, lng: longitude });
          }
        } catch (error) {
          console.error("Error reverse geocoding:", error);
          // Still set coordinates even if reverse geocoding fails
          setPickup(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          setPickupCoords({ lat: latitude, lng: longitude });
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        setLoadingLocation(false);
        let message = "Unable to retrieve your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Location access denied. Please enable location services in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Location information unavailable";
            break;
          case error.TIMEOUT:
            message = "Location request timed out";
            break;
        }
        
        alert(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  async function handleEstimate() {
    if (
      !pickup ||
      !dropoff ||
      !pickupCoords ||
      !dropoffCoords ||
      pickupCoords.lat === 0 ||
      dropoffCoords.lat === 0
    ) {
      alert("Please select valid pickup and dropoff locations");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickup: pickupCoords,
          dropoff: dropoffCoords,
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

    setLoading(true);
    try {
      // Create payment intent
      const paymentRes = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(estimate.amount * 100),
          currency: "gbp",
        }),
      });
      const { clientSecret } = await paymentRes.json();

      // Create booking
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riderId: user.id,
          pickupAddress: pickup,
          dropoffAddress: dropoff,
          pickupTime: new Date(),
          pickupLat: pickupCoords?.lat,
          pickupLng: pickupCoords?.lng,
          dropoffLat: dropoffCoords?.lat,
          dropoffLng: dropoffCoords?.lng,
          requiresWheelchair: wheelchair,
          priceEstimate: estimate,
          paymentIntentId: clientSecret,
        }),
      });

      if (bookingRes.ok) {
        const newBooking = await bookingRes.json();
        setBooking(newBooking);
        setPickup("");
        setPickupCoords(null);
        setDropoff("");
        setDropoffCoords(null);
        setEstimate(null);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to book ride");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelBooking(bookingId: string) {
    if (!confirm("Are you sure you want to cancel this ride?")) {
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
    (b) => b.status === "ASSIGNED" || b.status === "EN_ROUTE" || b.status === "ARRIVED"
  );

  // Show loading screen for pending booking
  if (pendingBooking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-blue-500">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-block p-3 bg-yellow-100 rounded-full mb-4">
                <svg
                  className="w-12 h-12 text-yellow-600 animate-pulse"
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
              <h2 className="text-2xl font-bold text-[#0F3D3E] mb-2">
                Finding Your Driver
              </h2>
              <p className="text-gray-600">
                Please wait while we match you with a nearby driver...
              </p>
            </div>

            {/* Booking Details */}
            <div className="bg-blue-50 rounded-xl p-6 mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  Status
                </span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                  {pendingBooking.status}
                </span>
              </div>

              <div className="border-t border-blue-200 pt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#00796B] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">A</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-medium">Pickup</p>
                    <p className="text-sm font-semibold text-[#0F3D3E]">
                      {pendingBooking.pickupAddress}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#0F3D3E] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">B</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 font-medium">Dropoff</p>
                    <p className="text-sm font-semibold text-[#0F3D3E]">
                      {pendingBooking.dropoffAddress}
                    </p>
                  </div>
                </div>
              </div>

              {pendingBooking.pinCode && (
                <div className="border-t border-blue-200 pt-4">
                  <div className="bg-white rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-600 mb-1">Your PIN:</p>
                    <p className="text-3xl font-bold text-[#00796B] tracking-wider">
                      {pendingBooking.pinCode}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Give this to your driver
                    </p>
                  </div>
                </div>
              )}

              {pendingBooking.priceEstimate && (
                <div className="border-t border-blue-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Estimated Fare</span>
                    <span className="text-xl font-bold text-[#0F3D3E]">
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
            <div className="flex justify-center mb-6">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-[#00796B] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-3 h-3 bg-[#00796B] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-3 h-3 bg-[#00796B] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => handleCancelBooking(pendingBooking.id)}
              className="w-full px-6 py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-semibold"
            >
              Cancel Ride
            </button>
          </div>
        </div>
      </div>
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
    <div className="px-8 py-6 max-w-7xl mx-auto">
      {/* Header with Welcome Message */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0F3D3E] mb-2">
          Welcome, {user?.firstName || "Rider"}
        </h1>
        <p className="text-gray-600">Where would you like to go today?</p>
      </div>

      {/* Booking Form */}
      {!booking && (
        <div className="bg-white rounded-2xl p-8 shadow-sm mb-8">
          <h2 className="text-2xl font-semibold text-[#0F3D3E] mb-6">
            Where to?
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Pickup Address
                  </label>
                  <button
                    onClick={handleUseCurrentLocation}
                    disabled={loadingLocation}
                    className="flex items-center gap-2 text-sm text-[#00796B] hover:text-[#0F3D3E] font-medium disabled:opacity-50"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
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
                    {loadingLocation ? "Getting location..." : "Use my location"}
                  </button>
                </div>
                <MapboxAutocomplete
                  value={pickup}
                  onChange={(address, coords) => {
                    setPickup(address);
                    setPickupCoords(coords);
                  }}
                  placeholder="Pickup location"
                  label=""
                  required
                />
              </div>

              <MapboxAutocomplete
                value={dropoff}
                onChange={(address, coords) => {
                  setDropoff(address);
                  setDropoffCoords(coords);
                }}
                placeholder="Enter destination"
                label="Drop-off Address"
                required
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="wheelchair"
                  checked={wheelchair}
                  onChange={(e) => setWheelchair(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="wheelchair" className="text-sm">
                  Wheelchair accessible vehicle
                </label>
              </div>

              <button
                onClick={handleEstimate}
                disabled={
                  !pickup ||
                  !dropoff ||
                  !pickupCoords ||
                  !dropoffCoords ||
                  pickupCoords?.lat === 0 ||
                  dropoffCoords?.lat === 0 ||
                  loading
                }
                className="w-full bg-[#00796B] text-white py-3 rounded-xl font-semibold hover:bg-[#00796B]/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Estimating..." : "Get Estimate"}
              </button>

              {estimate && (
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Estimated Fare:</span>
                    <span className="font-bold text-lg">
                      £{estimate.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Distance: ~{estimate.distanceKm.toFixed(1)} km
                  </div>
                  <button
                    onClick={handleBook}
                    disabled={loading}
                    className="w-full bg-[#00796B] text-white py-3 rounded-xl font-semibold hover:bg-[#00796B]/90 transition-colors mt-4"
                  >
                    {loading ? "Booking..." : "Book Ride"}
                  </button>
                </div>
              )}
            </div>

            {/* Map Preview */}
            <div className="lg:sticky lg:top-6 self-start">
              {(pickupCoords || dropoffCoords) && (
                <BookingMap
                  pickup={pickupCoords}
                  dropoff={dropoffCoords}
                  className="w-[650px] h-[800px]"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bookings List */}
      {bookings.length > 0 && (
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">My Bookings</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              {bookings.map((b: any) => (
                <div
                  key={b.id}
                  className={`border rounded p-4 cursor-pointer hover:shadow transition-shadow ${
                    selectedBookingId === b.id ? "ring-2 ring-blue-400" : ""
                  }`}
                  onClick={() => setSelectedBookingId(b.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-sm">
                        {b.pickupAddress}
                      </div>
                      <div className="text-xs text-gray-600">
                        → {b.dropoffAddress}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        b.status === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : b.status === "REQUESTED"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {b.createdAt && new Date(b.createdAt).toLocaleString()}
                  </div>
                  {b.pinCode &&
                    b.status !== "COMPLETED" &&
                    b.status !== "CANCELED" && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                        <div className="text-xs text-blue-600 font-semibold">
                          Your PIN: <span className="text-lg">{b.pinCode}</span>
                        </div>
                        <div className="text-xs text-blue-500 mt-1">
                          Give this to your driver
                        </div>
                      </div>
                    )}
                  {b.status !== "COMPLETED" &&
                    b.status !== "CANCELED" &&
                    b.status !== "IN_PROGRESS" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelBooking(b.id);
                        }}
                        className="mt-3 w-full px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        Cancel Ride
                      </button>
                    )}
                  {b.status === "COMPLETED" && b.rideQuality && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                      <div className="text-xs font-semibold text-green-800 mb-2">
                        Driver's Ride Report
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Quality:</span>
                          <span className="font-medium capitalize">
                            {b.rideQuality}
                          </span>
                          {b.rideQuality === "excellent" && "🌟"}
                          {b.rideQuality === "good" && "👍"}
                          {b.rideQuality === "fair" && "👌"}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">Comfort:</span>
                          <span className="font-medium capitalize">
                            {b.clientComfort.replace("_", " ")}
                          </span>
                          {b.clientComfort === "very_comfortable" && "😊"}
                          {b.clientComfort === "comfortable" && "🙂"}
                        </div>
                        {b.accessibilityNotes && (
                          <div className="mt-2 pt-2 border-t border-green-300">
                            <span className="text-gray-600">Notes:</span>
                            <p className="text-gray-700 mt-1">
                              {b.accessibilityNotes}
                            </p>
                          </div>
                        )}
                        {b.issuesReported && (
                          <div className="mt-2 pt-2 border-t border-green-300">
                            <span className="text-gray-600">Issues:</span>
                            <p className="text-gray-700 mt-1">
                              {b.issuesReported}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {b.finalFareAmount && (
                    <div className="text-sm font-semibold mt-2">
                      £{b.finalFareAmount.toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div>
              {selectedBookingId ? (
                (() => {
                  const selectedBooking = bookings.find(
                    (b) => b.id === selectedBookingId
                  );
                  const isCompleted =
                    selectedBooking?.status === "COMPLETED" ||
                    selectedBooking?.status === "CANCELED";

                  if (isCompleted) {
                    return (
                      <div className="text-sm text-gray-500 border rounded p-4 h-80 flex items-center justify-center">
                        <div className="text-center">
                          <p className="font-semibold">Chat Closed</p>
                          <p className="mt-2">This ride has been completed</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <ChatWidget
                      key={selectedBookingId}
                      bookingId={selectedBookingId}
                      sender="RIDER"
                    />
                  );
                })()
              ) : (
                <div className="text-sm text-gray-500 border rounded p-4 h-80 flex items-center justify-center">
                  Select a booking to view chat
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Booking Confirmation View */}
      {booking && (
        <div className="border rounded-lg p-6 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <h3 className="font-semibold text-green-900">
              Booking Confirmed! 🎉
            </h3>
            <p className="text-sm text-green-700 mt-1">
              Your PIN: <strong>{booking.pinCode}</strong>
            </p>
            <p className="text-xs text-green-600 mt-2">
              Give this PIN to your driver for pickup verification.
            </p>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium">From:</span>{" "}
              {booking.pickupAddress}
            </div>
            <div>
              <span className="text-sm font-medium">To:</span>{" "}
              {booking.dropoffAddress}
            </div>
            <div>
              <span className="text-sm font-medium">Status:</span>{" "}
              <span className="capitalize">{booking.status}</span>
            </div>
          </div>

          <ChatWidget key={booking.id} bookingId={booking.id} sender="RIDER" />

          <button
            onClick={() => {
              setBooking(null);
              setBookings([]);
            }}
            className="w-full border py-2 rounded hover:bg-gray-50"
          >
            Book Another Ride
          </button>
        </div>
      )}
    </div>
  );
}

export default function RiderPage() {
  return (
    <RoleGate requiredRole={["RIDER"]}>
      <AppLayout userRole="RIDER">
        <RiderPageContent />
      </AppLayout>
    </RoleGate>
  );
}

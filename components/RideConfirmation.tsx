"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ChatWidget from "./ChatWidget";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

// Dynamically import map component to avoid SSR issues
const DynamicMap = dynamic(() => import("./DriverLocationMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center">
      <p className="text-gray-500">Loading map...</p>
    </div>
  ),
});

interface RideConfirmationProps {
  booking: {
    id: string;
    pickupAddress: string;
    dropoffAddress: string;
    pickupLat?: number;
    pickupLng?: number;
    dropoffLat?: number;
    dropoffLng?: number;
    driverId?: string;
    driver?: {
      id: string;
      user: {
        name: string;
      };
      vehicleMake?: string;
      vehicleModel?: string;
      vehiclePlate?: string;
      lastLat?: number;
      lastLng?: number;
    };
    rider?: {
      user: {
        name: string;
      };
    };
    status: string;
    estimatedDistance?: number;
    estimatedDuration?: number;
    priceEstimate?: {
      amount: number;
      currency: string;
    };
    requiresWheelchair: boolean;
  };
  userRole: "RIDER" | "DRIVER";
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function RideConfirmation({
  booking,
  userRole,
  onConfirm,
  onCancel,
}: RideConfirmationProps) {
  const router = useRouter();
  const [driverETA, setDriverETA] = useState<number>(5); // ETA to pickup in minutes
  const [estimatedArrival, setEstimatedArrival] = useState<number>(
    booking.estimatedDuration || 8
  );
  const [showChat, setShowChat] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false); // For mobile drawer
  const [currentDriverLocation, setCurrentDriverLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(
    booking.driver?.lastLat && booking.driver?.lastLng
      ? { lat: booking.driver.lastLat, lng: booking.driver.lastLng }
      : null
  );
  const { unreadCount, markAsRead } = useUnreadMessages(booking.id, userRole);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371; // Radius of Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Fetch real-time driver location and recalculate ETA
  useEffect(() => {
    if (!booking.driverId || !booking.pickupLat || !booking.pickupLng) {
      console.log("Missing data for driver location:", {
        driverId: booking.driverId,
        pickupLat: booking.pickupLat,
        pickupLng: booking.pickupLng,
      });
      return;
    }

    const fetchDriverLocation = async () => {
      try {
        const response = await fetch(`/api/drivers/${booking.driverId}/location`);
        if (response.ok) {
          const data = await response.json();
          console.log("Driver location fetched:", data);
          
          if (data.lastLat && data.lastLng) {
            setCurrentDriverLocation({
              lat: data.lastLat,
              lng: data.lastLng,
            });

            // Recalculate ETA with real driver location
            const distance = calculateDistance(
              data.lastLat,
              data.lastLng,
              booking.pickupLat,
              booking.pickupLng
            );

            // Assume average speed of 30 km/h in city traffic
            const etaMinutes = (distance / 30) * 60;
            const calculatedETA = Math.max(1, Math.round(etaMinutes));
            console.log("Calculated ETA:", {
              distance: distance.toFixed(2) + " km",
              eta: calculatedETA + " min",
            });
            setDriverETA(calculatedETA);
          } else {
            console.log("Driver location not available yet");
          }
        } else {
          console.error("Failed to fetch driver location:", response.status);
        }
      } catch (error) {
        console.error("Error fetching driver location:", error);
      }
    };

    // Fetch immediately
    fetchDriverLocation();

    // Update every 5 seconds for real-time ETA
    const interval = setInterval(fetchDriverLocation, 5000);

    return () => clearInterval(interval);
  }, [booking.driverId, booking.pickupLat, booking.pickupLng]);

  const totalAmount = booking.priceEstimate?.amount || 10.8;
  const currency = booking.priceEstimate?.currency || "GBP";
  const symbol = currency === "GBP" ? "£" : "€";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Hidden on mobile, visible on desktop */}
      <div className="hidden lg:block bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-[#0F3D3E]">
          {userRole === "RIDER"
            ? `Confirm your ride to ${booking.dropoffAddress.split(",")[0]}`
            : `Ride to ${booking.dropoffAddress.split(",")[0]}`}
        </h1>
      </div>

      {/* Mobile: Full-screen map with floating details drawer */}
      <div className="lg:hidden flex-1 relative">
        {/* Full-screen Map */}
        <div className="absolute inset-0">
          <DynamicMap
            pickupLat={booking.pickupLat}
            pickupLng={booking.pickupLng}
            dropoffLat={booking.dropoffLat}
            dropoffLng={booking.dropoffLng}
            driverLat={booking.driver?.lastLat}
            driverLng={booking.driver?.lastLng}
            driverId={booking.driverId}
          />

          {/* Driver ETA Overlay for Riders */}
          {userRole === "RIDER" && booking.driver && (
            <div className="absolute top-4 left-4 right-4 bg-gradient-to-r from-[#00796B] to-[#0F3D3E] text-white rounded-lg shadow-lg p-3 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-[#00796B]"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm">
                      {booking.driver.user.name || "Driver"} is on the way
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{Math.round(driverETA)}</p>
                  <p className="text-xs opacity-90">min away</p>
                </div>
              </div>
            </div>
          )}

          {/* Driver Distance Overlay - for Drivers */}
          {userRole === "DRIVER" && currentDriverLocation && booking.pickupLat && booking.pickupLng && (
            <div className="absolute top-4 left-4 right-4 bg-gradient-to-r from-[#00796B] to-[#0F3D3E] text-white rounded-lg shadow-lg p-3 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#00796B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-sm">Pickup Location</p>
                    <p className="text-xs opacity-90">{booking.pickupAddress.split(",")[0]}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {calculateDistance(
                      currentDriverLocation.lat,
                      currentDriverLocation.lng,
                      booking.pickupLat,
                      booking.pickupLng
                    ).toFixed(1)}
                  </p>
                  <p className="text-xs opacity-90">km away</p>
                </div>
              </div>
            </div>
          )}

          {/* Route Information - Minimal on mobile */}
          <div className="absolute bottom-20 left-4 right-4 bg-white rounded-lg shadow-lg p-3 space-y-2 z-10">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-[#00796B] rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#0F3D3E] text-xs">Pickup location</p>
                <p className="text-xs text-gray-600 truncate">
                  {booking.pickupAddress.split(",")[0]}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-[#0F3D3E] rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#0F3D3E] text-xs">{booking.dropoffAddress.split(",")[0]}</p>
                <p className="text-xs text-gray-600">Total trip: {Math.round(estimatedArrival)} mins</p>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Bottom Drawer */}
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ease-in-out z-20 ${
            isDetailsExpanded ? 'h-[85vh]' : 'h-auto'
          }`}
        >
          {/* Drawer Handle */}
          <button
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            className="w-full py-3 flex flex-col items-center gap-1"
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isDetailsExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Minimized View - Always visible */}
          {!isDetailsExpanded && (
            <div className="px-6 pb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#0F3D3E] rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {userRole === "RIDER"
                    ? booking.driver?.user.name?.charAt(0) || "D"
                    : booking.rider?.user.name?.charAt(0) || "R"}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-[#0F3D3E]">
                    {userRole === "RIDER"
                      ? "Haven Accessible"
                      : booking.rider?.user.name || "Rider"}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {symbol}{Math.floor(totalAmount)}-{Math.ceil(totalAmount)} • {Math.round(estimatedArrival)} min
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowChat(true);
                    markAsRead();
                  }}
                  className="flex-1 py-3 bg-white border-2 border-[#00796B] text-[#00796B] rounded-lg font-semibold text-sm relative"
                >
                  Chat
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (userRole === "DRIVER" && booking.pickupLat && booking.pickupLng) {
                      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                      let destination;
                      if (booking.status === "ASSIGNED" || booking.status === "EN_ROUTE") {
                        destination = `${booking.pickupLat},${booking.pickupLng}`;
                      } else if (booking.status === "ARRIVED" && booking.dropoffLat && booking.dropoffLng) {
                        destination = `${booking.dropoffLat},${booking.dropoffLng}`;
                      }
                      if (destination) {
                        if (isIOS) {
                          window.open(`maps://maps.apple.com/?daddr=${destination}&dirflg=d`, "_blank");
                        } else {
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`, "_blank");
                        }
                      }
                    }
                    onConfirm?.();
                  }}
                  className="flex-1 bg-[#00796B] text-white py-3 rounded-lg font-semibold text-sm"
                >
                  {userRole === "RIDER"
                    ? "Confirm"
                    : booking.status === "ASSIGNED"
                    ? "Navigate"
                    : booking.status === "EN_ROUTE"
                    ? "Arrived"
                    : "Start Trip"}
                </button>
              </div>
            </div>
          )}

          {/* Expanded View - Full details */}
          {isDetailsExpanded && (
            <div className="px-6 pb-6 overflow-y-auto h-[calc(85vh-60px)]">
              <div className="space-y-4">
                {/* Driver/Rider Info */}
                <div className="flex items-center gap-4 pb-4 border-b">
                  <div className="w-16 h-16 bg-[#0F3D3E] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {userRole === "RIDER"
                      ? booking.driver?.user.name?.charAt(0) || "D"
                      : booking.rider?.user.name?.charAt(0) || "R"}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-[#0F3D3E]">
                      {userRole === "RIDER"
                        ? "Haven Accessible"
                        : booking.rider?.user.name || "Rider"}
                    </h2>
                    {userRole === "RIDER" && (
                      <p className="text-gray-600 text-sm">
                        {booking.driver?.user.name || "Your driver"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-3xl font-bold text-[#0F3D3E]">
                      {symbol}{Math.floor(totalAmount)}-{Math.ceil(totalAmount)}
                    </p>
                    <p className="text-gray-600 text-sm">{Math.round(estimatedArrival)} min</p>
                  </div>
                </div>

                {userRole === "RIDER" && booking.driver && (
                  <div className="space-y-2 text-sm pb-4 border-b">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vehicle make</span>
                      <span className="font-medium">{booking.driver.vehicleMake || "Toyota"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">License</span>
                      <span className="font-medium">{booking.driver.vehiclePlate || "ABC123"}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2 text-sm pb-4 border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Wheelchair access:</span>
                    <span className="font-medium">{booking.requiresWheelchair ? "Yes" : "No"}</span>
                  </div>
                  {userRole === "DRIVER" && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Assistance required:</span>
                      <span className="font-medium">Yes</span>
                    </div>
                  )}
                </div>

                {userRole === "RIDER" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <select className="w-full border border-gray-300 rounded-lg px-4 py-2">
                      <option>Card ending in 2483</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  {onCancel && booking.status !== "IN_PROGRESS" && (
                    <button
                      onClick={onCancel}
                      className="flex-1 bg-red-50 text-red-600 py-3 rounded-lg font-semibold border border-red-200"
                    >
                      Cancel Ride
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (userRole === "DRIVER" && booking.pickupLat && booking.pickupLng) {
                        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                        let destination;
                        if (booking.status === "ASSIGNED" || booking.status === "EN_ROUTE") {
                          destination = `${booking.pickupLat},${booking.pickupLng}`;
                        } else if (booking.status === "ARRIVED" && booking.dropoffLat && booking.dropoffLng) {
                          destination = `${booking.dropoffLat},${booking.dropoffLng}`;
                        }
                        if (destination) {
                          if (isIOS) {
                            window.open(`maps://maps.apple.com/?daddr=${destination}&dirflg=d`, "_blank");
                          } else {
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`, "_blank");
                          }
                        }
                      }
                      onConfirm?.();
                    }}
                    className="flex-1 bg-[#00796B] text-white py-3 rounded-lg font-semibold"
                  >
                    {userRole === "RIDER"
                      ? "Confirm Ride"
                      : booking.status === "ASSIGNED"
                      ? "Start Navigation"
                      : booking.status === "EN_ROUTE"
                      ? "I've Arrived"
                      : booking.status === "ARRIVED"
                      ? "Start Trip"
                      : "Continue"}
                  </button>
                </div>

                <button
                  onClick={() => {
                    setShowChat(true);
                    markAsRead();
                  }}
                  className="w-full py-3 bg-white border-2 border-[#00796B] text-[#00796B] rounded-lg font-semibold relative"
                >
                  Chat with {userRole === "RIDER" ? "Driver" : "Rider"}
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout - Original two-column layout */}
      <div className="hidden lg:grid flex-1 grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Left Column - Details */}
        <div className="space-y-6">
          {/* Driver/Rider Info Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-[#0F3D3E] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {userRole === "RIDER"
                  ? booking.driver?.user.name?.charAt(0) || "D"
                  : booking.rider?.user.name?.charAt(0) || "R"}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-[#0F3D3E]">
                  {userRole === "RIDER"
                    ? "Haven Accessible"
                    : booking.rider?.user.name || "Rider"}
                </h2>
                {userRole === "RIDER" && (
                  <p className="text-gray-600">
                    {booking.driver?.user.name || "Your driver"}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-3xl font-bold text-[#0F3D3E]">
                  {symbol} {Math.floor(totalAmount)}-{Math.ceil(totalAmount)}
                </p>
                <p className="text-gray-600 text-sm">
                  {Math.round(estimatedArrival)} min
                </p>
              </div>
            </div>

            {userRole === "RIDER" && booking.driver && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Vehicle make</span>
                  <span className="font-medium">
                    {booking.driver.vehicleMake || "Toyota"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">License</span>
                  <span className="font-medium">
                    {booking.driver.vehiclePlate || "ABC123"}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Wheelchair access:</span>
                <span className="font-medium">
                  {booking.requiresWheelchair ? "Yes" : "No"}
                </span>
              </div>
              {userRole === "DRIVER" && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Assistance required:</span>
                  <span className="font-medium">Yes</span>
                </div>
              )}
            </div>

            {userRole === "RIDER" && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <select className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00796B]">
                  <option>Card ending in 2483</option>
                </select>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              {onCancel && booking.status !== "IN_PROGRESS" && (
                <button
                  onClick={onCancel}
                  className="flex-1 bg-red-50 text-red-600 py-3 rounded-lg font-semibold hover:bg-red-100 transition-colors border border-red-200"
                >
                  Cancel Ride
                </button>
              )}
              <button
                onClick={() => {
                  if (
                    userRole === "DRIVER" &&
                    booking.pickupLat &&
                    booking.pickupLng
                  ) {
                    // Open navigation to pickup or dropoff location based on status
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                    let destination;

                    if (
                      booking.status === "ASSIGNED" ||
                      booking.status === "EN_ROUTE"
                    ) {
                      // Navigate to pickup location
                      destination = `${booking.pickupLat},${booking.pickupLng}`;
                    } else if (
                      booking.status === "ARRIVED" &&
                      booking.dropoffLat &&
                      booking.dropoffLng
                    ) {
                      // Navigate to dropoff location
                      destination = `${booking.dropoffLat},${booking.dropoffLng}`;
                    }

                    if (destination) {
                      if (isIOS) {
                        // Open Apple Maps on iOS
                        window.open(
                          `maps://maps.apple.com/?daddr=${destination}&dirflg=d`,
                          "_blank"
                        );
                      } else {
                        // Open Google Maps on other platforms
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
                          "_blank"
                        );
                      }
                    }
                  }
                  onConfirm?.();
                }}
                className="flex-1 bg-[#00796B] text-white py-3 rounded-lg font-semibold hover:bg-[#00695C] transition-colors flex items-center justify-center gap-2"
              >
                {userRole === "DRIVER" && (
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
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                )}
                {userRole === "RIDER"
                  ? "Confirm Ride"
                  : booking.status === "ASSIGNED"
                  ? "Start Navigation"
                  : booking.status === "EN_ROUTE"
                  ? "I've Arrived"
                  : booking.status === "ARRIVED"
                  ? "Start Trip"
                  : "Continue"}
              </button>
            </div>

            {/* Chat Button */}
            <button
              onClick={() => {
                setShowChat(true);
                markAsRead();
              }}
              className="w-full mt-3 py-3 bg-white border-2 border-[#00796B] text-[#00796B] rounded-lg font-semibold hover:bg-[#E0F2F1] transition-colors flex items-center justify-center gap-2 relative"
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
              Chat with {userRole === "RIDER" ? "Driver" : "Rider"}
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right Column - Map and Route */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="relative h-full min-h-[500px]">
            {/* Map with driver location */}
            <DynamicMap
              pickupLat={booking.pickupLat}
              pickupLng={booking.pickupLng}
              dropoffLat={booking.dropoffLat}
              dropoffLng={booking.dropoffLng}
              driverLat={booking.driver?.lastLat}
              driverLng={booking.driver?.lastLng}
              driverId={booking.driverId}
            />

            {/* Driver ETA Overlay for Riders */}
            {userRole === "RIDER" && booking.driver && (
              <div className="absolute top-4 left-4 right-4 bg-gradient-to-r from-[#00796B] to-[#0F3D3E] text-white rounded-lg shadow-lg p-4 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                      <svg
                        className="w-7 h-7 text-[#00796B]"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-lg">
                        {booking.driver.user.name || "Your driver"} is on the
                        way
                      </p>
                      <p className="text-sm opacity-90">
                        {booking.driver.vehicleMake}{" "}
                        {booking.driver.vehicleModel}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">
                      {Math.round(driverETA)}
                    </p>
                    <p className="text-sm opacity-90">min away</p>
                  </div>
                </div>
              </div>
            )}

            {/* Driver Distance Overlay - for Drivers */}
            {userRole === "DRIVER" && currentDriverLocation && booking.pickupLat && booking.pickupLng && (
              <div className="absolute top-4 left-4 right-4 bg-gradient-to-r from-[#00796B] to-[#0F3D3E] text-white rounded-lg shadow-lg p-4 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                      <svg className="w-7 h-7 text-[#00796B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-lg">Pickup Location</p>
                      <p className="text-sm opacity-90">{booking.pickupAddress.split(",")[0]}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">
                      {calculateDistance(
                        currentDriverLocation.lat,
                        currentDriverLocation.lng,
                        booking.pickupLat,
                        booking.pickupLng
                      ).toFixed(1)}
                    </p>
                    <p className="text-sm opacity-90">km away</p>
                  </div>
                </div>
              </div>
            )}

            {/* Route Information Overlay */}
            <div
              className={`absolute left-4 right-4 bg-white rounded-lg shadow-lg p-4 space-y-3 z-10 ${
                userRole === "RIDER" && booking.driver ? "bottom-4" : "top-4"
              }`}
            >
              {/* Pickup */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[#00796B] rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <circle cx="10" cy="10" r="4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[#0F3D3E] text-sm">
                    Pickup location
                  </p>
                  <p className="text-xs text-gray-600 line-clamp-1">
                    {booking.pickupAddress}
                  </p>
                </div>
              </div>

              {/* Dropoff */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[#0F3D3E] rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[#0F3D3E] text-sm">
                    {booking.dropoffAddress.split(",")[0]}
                  </p>
                  <p className="text-xs text-gray-600 line-clamp-1">
                    {booking.dropoffAddress}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Trip Summary */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                {userRole === "RIDER" ? (
                  <>
                    <p className="text-sm text-gray-600">
                      Driver arrives in:{" "}
                      <span className="font-bold text-[#00796B]">
                        {Math.round(driverETA)} mins
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Total trip: {Math.round(estimatedArrival)} mins
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">
                    Trip duration: {Math.round(estimatedArrival)} mins
                  </p>
                )}
              </div>
              <span className="text-xl font-bold text-[#0F3D3E]">
                Total: {symbol}
                {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      {showChat && (
        <div
          className="fixed inset-0 flex items-center justify-center p-6 z-50"
          style={{
            backdropFilter: "blur(10px)",
            backgroundColor: "rgba(255, 255, 255, 0.3)",
          }}
          onClick={() => setShowChat(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-[#00796B] to-[#0F3D3E]">
              <h3 className="text-xl font-bold text-white">
                Chat with {userRole === "RIDER" ? "Driver" : "Rider"}
              </h3>
              <button
                onClick={() => setShowChat(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <svg
                  className="w-6 h-6 text-white"
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
            <div className="flex-1 overflow-hidden bg-[#E0F2F1]">
              <ChatWidget
                bookingId={booking.id}
                sender={userRole}
                onMarkAsRead={markAsRead}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import ChatWidget from "./ChatWidget";

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

  useEffect(() => {
    // Calculate ETA if driver location is available
    if (
      booking.driver?.lastLat &&
      booking.driver?.lastLng &&
      booking.pickupLat &&
      booking.pickupLng
    ) {
      const distance = calculateDistance(
        booking.driver.lastLat,
        booking.driver.lastLng,
        booking.pickupLat,
        booking.pickupLng
      );
      
      // Assume average speed of 30 km/h in city traffic
      const etaMinutes = (distance / 30) * 60;
      setDriverETA(Math.max(1, Math.round(etaMinutes)));
    }

    // Update ETA periodically
    const interval = setInterval(() => {
      setDriverETA((prev) => Math.max(1, prev - 0.2));
      setEstimatedArrival((prev) => Math.max(1, prev - 0.1));
    }, 6000); // Update every 6 seconds

    return () => clearInterval(interval);
  }, [booking.driver?.lastLat, booking.driver?.lastLng, booking.pickupLat, booking.pickupLng]);

  const totalAmount = booking.priceEstimate?.amount || 10.8;
  const currency = booking.priceEstimate?.currency || "GBP";
  const symbol = currency === "GBP" ? "£" : "€";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-semibold text-[#0F3D3E]">
          {userRole === "RIDER"
            ? `Confirm your ride to ${booking.dropoffAddress.split(",")[0]}`
            : `Ride to ${booking.dropoffAddress.split(",")[0]}`}
        </h1>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
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
                  {userRole === "RIDER" ? "Haven Accessible" : booking.rider?.user.name || "Rider"}
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
                  if (userRole === "DRIVER" && booking.pickupLat && booking.pickupLng) {
                    // Open navigation to pickup location
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                    const destination = `${booking.pickupLat},${booking.pickupLng}`;
                    
                    if (isIOS) {
                      // Open Apple Maps on iOS
                      window.open(`maps://maps.apple.com/?daddr=${destination}&dirflg=d`, '_blank');
                    } else {
                      // Open Google Maps on other platforms
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`, '_blank');
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
                {userRole === "RIDER" ? "Confirm Ride" : "Start Navigation"}
              </button>
            </div>

            {/* Chat Button */}
            <button
              onClick={() => setShowChat(true)}
              className="w-full mt-3 py-3 bg-white border-2 border-[#00796B] text-[#00796B] rounded-lg font-semibold hover:bg-[#E0F2F1] transition-colors flex items-center justify-center gap-2"
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
                        {booking.driver.user.name || "Your driver"} is on the way
                      </p>
                      <p className="text-sm opacity-90">
                        {booking.driver.vehicleMake} {booking.driver.vehicleModel}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{Math.round(driverETA)}</p>
                    <p className="text-sm opacity-90">min away</p>
                  </div>
                </div>
              </div>
            )}

            {/* Route Information Overlay */}
            <div className={`absolute left-4 right-4 bg-white rounded-lg shadow-lg p-4 space-y-3 z-10 ${
              userRole === "RIDER" && booking.driver ? "bottom-4" : "top-4"
            }`}>
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
                      Driver arrives in: <span className="font-bold text-[#00796B]">{Math.round(driverETA)} mins</span>
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
            backdropFilter: 'blur(10px)',
            backgroundColor: 'rgba(255, 255, 255, 0.3)'
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
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

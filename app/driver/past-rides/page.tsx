"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import AppLayout from "@/components/AppLayout";
import RoleGate from "@/components/RoleGate";

function DriverPastRidesContent() {
  const { user } = useUser();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "completed" | "canceled">("all");

  useEffect(() => {
    if (!user?.id) return;

    async function fetchBookings() {
      try {
        const res = await fetch("/api/bookings");
        if (!res.ok) {
          console.error("Failed to fetch bookings:", res.status, res.statusText);
          setBookings([]);
          return;
        }
        
        const text = await res.text();
        if (!text || text.trim() === '') {
          console.warn("Empty response from bookings API");
          setBookings([]);
          return;
        }
        
        const data = JSON.parse(text);
        const myCompletedBookings = Array.isArray(data) ? data.filter(
          (b: any) =>
            b.driverId === user?.id &&
            (b.status === "COMPLETED" || b.status === "CANCELED")
        ) : [];
        setBookings(myCompletedBookings);
      } catch (e) {
        console.error("Error fetching bookings:", e);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, [user?.id]);

  const filteredBookings = bookings.filter((b) => {
    if (filter === "all") return true;
    if (filter === "completed") return b.status === "COMPLETED";
    if (filter === "canceled") return b.status === "CANCELED";
    return true;
  });

  const totalEarnings = filteredBookings
    .filter((b) => b.status === "COMPLETED" && b.finalFareAmount)
    .reduce((sum, b) => sum + b.finalFareAmount * 0.75, 0);

  return (
    <div className="px-8 py-6 max-w-7xl mx-auto safe-area-content">
      {/* Header */}
      <div className="mb-4 safe-area-top">
        <h1 className="text-2xl font-bold text-[#5C7E9B] mb-1">Past Rides</h1>
        <p className="text-sm text-gray-600">View your completed rides history</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-gray-600 mb-1">Total Rides</div>
          <div className="text-xl font-bold text-[#5C7E9B]">
            {filteredBookings.length}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-gray-600 mb-1">Total Earnings</div>
          <div className="text-xl font-bold text-[#5C7E9B]">
            £{totalEarnings.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-gray-600 mb-1">Avg Per Ride</div>
          <div className="text-xl font-bold text-[#5C7E9B]">
            £
            {filteredBookings.length > 0
              ? (
                  totalEarnings /
                    filteredBookings.filter((b) => b.status === "COMPLETED")
                      .length || 0
                ).toFixed(2)
              : "0.00"}
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-[#5C7E9B] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All ({bookings.length})
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === "completed"
                ? "bg-[#5C7E9B] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Completed ({bookings.filter((b) => b.status === "COMPLETED").length})
          </button>
          <button
            onClick={() => setFilter("canceled")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === "canceled"
                ? "bg-[#5C7E9B] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Canceled ({bookings.filter((b) => b.status === "CANCELED").length})
          </button>
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
          <p className="text-gray-500">Loading your past rides...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
          <p className="text-gray-500 text-lg mb-2">No rides found</p>
          <p className="text-gray-400 text-sm">
            {filter === "all"
              ? "You haven't completed any rides yet"
              : `You have no ${filter} rides`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        booking.status === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {booking.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(booking.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {booking.status === "COMPLETED" && booking.documentedAt && (
                      <>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-600">
                          Completed: {new Date(booking.documentedAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })} at {new Date(booking.documentedAt).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {booking.finalFareAmount && booking.status === "COMPLETED" && (
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-0.5">
                      Earnings
                    </div>
                    <div className="text-xl font-bold text-[#5C7E9B]">
                      £{(booking.finalFareAmount * 0.75).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">
                      (Total: £{booking.finalFareAmount.toFixed(2)})
                    </div>
                  </div>
                )}
              </div>

              {/* Route */}
              <div className="space-y-2 mb-3">
                <div className="flex items-start gap-2">
                  <div className="mt-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Pickup</div>
                    <div className="font-medium text-sm text-gray-900">
                      {booking.pickupAddress}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-0.5">Drop-off</div>
                    <div className="font-medium text-sm text-gray-900">
                      {booking.dropoffAddress}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ride Details */}
              <div className="border-t pt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                {booking.estimatedDistance && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Distance</div>
                    <div className="font-medium">
                      {booking.estimatedDistance.toFixed(1)} km
                    </div>
                  </div>
                )}
                {booking.status === "COMPLETED" && booking.documentedAt && booking.createdAt ? (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      Ride Duration
                    </div>
                    <div className="font-medium">
                      {Math.round(
                        (new Date(booking.documentedAt).getTime() - new Date(booking.createdAt).getTime()) / (1000 * 60)
                      )} min
                    </div>
                  </div>
                ) : booking.estimatedDuration ? (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Estimated Duration</div>
                    <div className="font-medium">
                      {booking.estimatedDuration.toFixed(0)} min
                    </div>
                  </div>
                ) : null}
                {booking.requiresWheelchair && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      Accessibility
                    </div>
                    <div className="font-medium">♿ Wheelchair</div>
                  </div>
                )}
                {booking.riderPhone && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Rider</div>
                    <div className="font-medium text-sm">
                      {booking.riderPhone}
                    </div>
                  </div>
                )}
              </div>

              {/* Your Documentation (if completed) */}
              {booking.status === "COMPLETED" && booking.rideQuality && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-xs font-semibold text-blue-800 mb-2">
                    Your Documentation
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <div>
                      <span className="text-gray-600">Quality:</span>
                      <span className="ml-1 font-medium capitalize">
                        {booking.rideQuality}
                      </span>
                      <span className="ml-1">
                        {booking.rideQuality === "excellent" && "🌟"}
                        {booking.rideQuality === "good" && "👍"}
                        {booking.rideQuality === "fair" && "👌"}
                        {booking.rideQuality === "poor" && "😞"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Comfort:</span>
                      <span className="ml-1 font-medium capitalize">
                        {booking.clientComfort.replace("_", " ")}
                      </span>
                      <span className="ml-1">
                        {booking.clientComfort === "very_comfortable" && "😊"}
                        {booking.clientComfort === "comfortable" && "🙂"}
                      </span>
                    </div>
                  </div>
                  {(booking.accessibilityNotes || booking.issuesReported) && (
                    <div className="mt-2 pt-2 border-t border-blue-300 space-y-1">
                      {booking.accessibilityNotes && (
                        <div className="text-xs">
                          <span className="text-gray-600 font-medium">Accessibility Notes:</span>
                          <span className="ml-1 text-gray-700">{booking.accessibilityNotes}</span>
                        </div>
                      )}
                      {booking.issuesReported && (
                        <div className="text-xs">
                          <span className="text-gray-600 font-medium">Issues:</span>
                          <span className="ml-1 text-gray-700">{booking.issuesReported}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Rider's Rating (if completed and rated) */}
              {booking.status === "COMPLETED" && booking.ratings && booking.ratings.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-xs font-semibold text-green-800 mb-2">
                    Rider's Rating
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Driver:</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`text-sm ${
                              i < booking.ratings[0].driverRating
                                ? "text-yellow-400"
                                : "text-gray-300"
                            }`}
                          >
                            ★
                          </span>
                        ))}
                        <span className="text-xs text-gray-500 ml-1">
                          ({booking.ratings[0].driverRating}/5)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">Ride:</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`text-sm ${
                              i < booking.ratings[0].rideRating
                                ? "text-yellow-400"
                                : "text-gray-300"
                            }`}
                          >
                            ★
                          </span>
                        ))}
                        <span className="text-xs text-gray-500 ml-1">
                          ({booking.ratings[0].rideRating}/5)
                        </span>
                      </div>
                    </div>
                  </div>
                  {(booking.ratings[0].driverComment || booking.ratings[0].rideComment) && (
                    <div className="mt-2 pt-2 border-t border-green-300 space-y-1">
                      {booking.ratings[0].driverComment && (
                        <div className="text-xs text-gray-700">
                          <span className="font-medium">Driver:</span> {booking.ratings[0].driverComment}
                        </div>
                      )}
                      {booking.ratings[0].rideComment && (
                        <div className="text-xs text-gray-700">
                          <span className="font-medium">Ride:</span> {booking.ratings[0].rideComment}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DriverPastRidesPage() {
  return (
    <RoleGate requiredRole={["DRIVER"]}>
      <AppLayout userRole="DRIVER">
        <DriverPastRidesContent />
      </AppLayout>
    </RoleGate>
  );
}

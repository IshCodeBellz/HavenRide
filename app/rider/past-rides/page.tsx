"use client";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import AppLayout from "@/components/AppLayout";
import RoleGate from "@/components/RoleGate";

export default function PastRidesPage() {
  const { user } = useUser();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "completed" | "canceled">("all");
  const [ratingBookingId, setRatingBookingId] = useState<string | null>(null);
  const [driverRating, setDriverRating] = useState(0);
  const [rideRating, setRideRating] = useState(0);
  const [driverComment, setDriverComment] = useState("");
  const [rideComment, setRideComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [hoveredDriverStar, setHoveredDriverStar] = useState(0);
  const [hoveredRideStar, setHoveredRideStar] = useState(0);

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
            b.riderId === user?.id &&
            (b.status === "COMPLETED" || b.status === "CANCELED")
        ) : [];
        
        // Fetch ratings for each booking
        const bookingsWithRatings = await Promise.all(
          myCompletedBookings.map(async (booking: any) => {
            if (booking.status === "COMPLETED") {
              try {
                const ratingRes = await fetch(
                  `/api/riders/ratings?bookingId=${booking.id}`
                );
                if (ratingRes.ok) {
                  const ratingText = await ratingRes.text();
                  if (ratingText && ratingText.trim() !== '') {
                    booking.rating = JSON.parse(ratingText);
                  }
                }
              } catch (error) {
                // Rating doesn't exist yet, that's fine
              }
            }
            return booking;
          })
        );
        
        setBookings(bookingsWithRatings);
      } catch (e) {
        console.error("Error fetching bookings:", e);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, [user?.id]);

  async function handleSubmitRating(bookingId: string) {
    if (driverRating === 0 || rideRating === 0) {
      alert("Please provide ratings for both driver and ride");
      return;
    }

    try {
      setSubmittingRating(true);
      const res = await fetch("/api/riders/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          driverRating,
          rideRating,
          driverComment: driverComment || null,
          rideComment: rideComment || null,
        }),
      });

      if (res.ok) {
        alert("Thank you for your rating!");
        setRatingBookingId(null);
        setDriverRating(0);
        setRideRating(0);
        setDriverComment("");
        setRideComment("");
        // Refresh bookings to show rating
        const bookingsRes = await fetch("/api/bookings");
        const data = await bookingsRes.json();
        const myBookings = data.filter(
          (b: any) =>
            b.riderId === user?.id &&
            (b.status === "COMPLETED" || b.status === "CANCELED")
        );
        setBookings(myBookings);
      } else {
        const errorData = await res.json();
        alert(`Failed to submit rating: ${errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert("Failed to submit rating");
    } finally {
      setSubmittingRating(false);
    }
  }

  const filteredBookings = bookings.filter((b) => {
    if (filter === "all") return true;
    if (filter === "completed") return b.status === "COMPLETED";
    if (filter === "canceled") return b.status === "CANCELED";
    return true;
  });

  return (
    <RoleGate requiredRole={["RIDER"]}>
      <AppLayout userRole="RIDER">
        <div className="px-8 py-6 max-w-7xl mx-auto safe-area-content">
          {/* Header */}
          <div className="mb-8 safe-area-top">
            <h1 className="text-3xl font-bold text-[#5C7E9B] mb-2">
              Past Rides
            </h1>
            <p className="text-gray-600">View your ride history</p>
          </div>

          {/* Filter Buttons */}
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
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
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
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
                          {new Date(booking.createdAt).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
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
                    {(booking.finalFareAmount || (booking.priceEstimate as any)?.amount) && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#5C7E9B]">
                          £{(booking.finalFareAmount || (booking.priceEstimate as any)?.amount || 0).toFixed(2)}
                        </div>
                        {booking.finalFareAmount && (booking.priceEstimate as any)?.amount && 
                         booking.finalFareAmount !== (booking.priceEstimate as any)?.amount && (
                          <div className="text-xs text-gray-500 mt-1">
                            Est: £{((booking.priceEstimate as any)?.amount || 0).toFixed(2)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Route */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Pickup</div>
                        <div className="font-medium text-gray-900">
                          {booking.pickupAddress}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          Drop-off
                        </div>
                        <div className="font-medium text-gray-900">
                          {booking.dropoffAddress}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ride Details */}
                  <div className="border-t pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {booking.estimatedDistance && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          Distance
                        </div>
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
                        <div className="text-xs text-gray-500 mb-1">
                          Estimated Duration
                        </div>
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
                    {booking.driverPhone && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Driver</div>
                        <div className="font-medium text-sm">
                          {booking.driverPhone}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Driver's Ride Report (if completed) */}
                  {booking.status === "COMPLETED" && booking.rideQuality && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-xs font-semibold text-green-800 mb-2">
                        Driver's Ride Report
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
                            {booking.clientComfort === "very_comfortable" &&
                              "😊"}
                            {booking.clientComfort === "comfortable" && "🙂"}
                          </span>
                        </div>
                      </div>
                      {(booking.accessibilityNotes ||
                        booking.issuesReported) && (
                        <div className="mt-2 pt-2 border-t border-green-300 space-y-1">
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

                  {/* Rating Section */}
                  {booking.status === "COMPLETED" && !booking.rating && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-blue-800">
                          Rate Your Ride
                        </div>
                        <button
                          onClick={() => setRatingBookingId(booking.id)}
                          className="px-3 py-1.5 bg-[#5C7E9B] text-white rounded-lg text-xs font-medium hover:bg-[#4A6B85] transition-colors"
                        >
                          Rate Now
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Show existing rating if exists */}
                  {booking.status === "COMPLETED" && booking.rating && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-xs font-semibold text-green-800 mb-2">
                        Your Rating
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600">Driver:</span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span
                                key={i}
                                className={`text-sm ${
                                  i < booking.rating.driverRating
                                    ? "text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600">Ride:</span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span
                                key={i}
                                className={`text-sm ${
                                  i < booking.rating.rideRating
                                    ? "text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      {(booking.rating.driverComment || booking.rating.rideComment) && (
                        <div className="mt-2 pt-2 border-t border-green-300 space-y-1">
                          {booking.rating.driverComment && (
                            <div className="text-xs text-gray-700">
                              <span className="font-medium">Driver:</span> {booking.rating.driverComment}
                            </div>
                          )}
                          {booking.rating.rideComment && (
                            <div className="text-xs text-gray-700">
                              <span className="font-medium">Ride:</span> {booking.rating.rideComment}
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

          {/* Rating Modal */}
          {ratingBookingId && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div 
                className="rounded-2xl p-6 max-w-md w-full border border-white/40 shadow-2xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(30px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">
                    Rate Your Ride
                  </h3>
                  <button
                    onClick={() => {
                      setRatingBookingId(null);
                      setDriverRating(0);
                      setRideRating(0);
                      setDriverComment("");
                      setRideComment("");
                    }}
                    className="text-white/70 hover:text-white"
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

                <div className="space-y-6">
                  {/* Driver Rating */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Rate Your Driver
                    </label>
                    <div 
                      className="flex items-center gap-2"
                      onMouseLeave={() => setHoveredDriverStar(0)}
                    >
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isHighlighted = star <= (hoveredDriverStar || driverRating);
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setDriverRating(star)}
                            onMouseEnter={() => setHoveredDriverStar(star)}
                            className={`text-3xl transition-colors ${
                              isHighlighted
                                ? "text-yellow-400"
                                : "text-white/40"
                            }`}
                          >
                            ★
                          </button>
                        );
                      })}
                    </div>
                    <textarea
                      value={driverComment}
                      onChange={(e) => setDriverComment(e.target.value)}
                      placeholder="Optional feedback about your driver..."
                      className="w-full mt-2 border border-white/30 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                    />
                  </div>

                  {/* Ride Rating */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Rate Your Ride Experience
                    </label>
                    <div 
                      className="flex items-center gap-2"
                      onMouseLeave={() => setHoveredRideStar(0)}
                    >
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isHighlighted = star <= (hoveredRideStar || rideRating);
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRideRating(star)}
                            onMouseEnter={() => setHoveredRideStar(star)}
                            className={`text-3xl transition-colors ${
                              isHighlighted
                                ? "text-yellow-400"
                                : "text-white/40"
                            }`}
                          >
                            ★
                          </button>
                        );
                      })}
                    </div>
                    <textarea
                      value={rideComment}
                      onChange={(e) => setRideComment(e.target.value)}
                      placeholder="Optional feedback about your ride..."
                      className="w-full mt-2 border border-white/30 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setRatingBookingId(null);
                        setDriverRating(0);
                        setRideRating(0);
                        setDriverComment("");
                        setRideComment("");
                      }}
                      className="flex-1 border border-white/30 text-white py-2 rounded-lg font-medium hover:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSubmitRating(ratingBookingId)}
                      disabled={submittingRating || driverRating === 0 || rideRating === 0}
                      className="flex-1 bg-[#5C7E9B] text-white py-2 rounded-lg font-medium hover:bg-[#4A6B85] disabled:opacity-50"
                    >
                      {submittingRating ? "Submitting..." : "Submit Rating"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </RoleGate>
  );
}

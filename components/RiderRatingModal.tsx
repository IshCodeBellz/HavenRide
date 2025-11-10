"use client";
import { useState } from "react";

interface RiderRatingModalProps {
  bookingId: string;
  driverName?: string;
  onSubmit: (data: {
    driverRating: number;
    rideRating: number;
    driverComment?: string;
    rideComment?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function RiderRatingModal({
  bookingId,
  driverName = "Driver",
  onSubmit,
  onCancel,
}: RiderRatingModalProps) {
  const [driverRating, setDriverRating] = useState(0);
  const [rideRating, setRideRating] = useState(0);
  const [driverComment, setDriverComment] = useState("");
  const [rideComment, setRideComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (driverRating === 0 || rideRating === 0) {
      alert("Please rate both the driver and the ride");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        driverRating,
        rideRating,
        driverComment: driverComment.trim() || undefined,
        rideComment: rideComment.trim() || undefined,
      });
      // Success - form will be closed by parent component
    } catch (error) {
      console.error("Failed to submit rating:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit rating. Please try again.";
      alert(errorMessage);
      setSubmitting(false); // Only set submitting to false on error, so user can retry
    }
  };

  const StarRating = ({
    rating,
    onRatingChange,
    label,
  }: {
    rating: number;
    onRatingChange: (rating: number) => void;
    label: string;
  }) => (
    <div className="space-y-2">
      <label className="block text-xs sm:text-sm font-semibold text-gray-700">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="flex items-center gap-1 sm:gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`text-2xl sm:text-3xl transition-colors ${
              star <= rating
                ? "text-yellow-400"
                : "text-gray-300 hover:text-yellow-200"
            }`}
          >
            ★
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm text-gray-600">
            {rating} {rating === 1 ? "star" : "stars"}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-[60]"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">
          Rate Your Ride
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
          How was your experience with {driverName}?
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Driver Rating */}
          <StarRating
            rating={driverRating}
            onRatingChange={setDriverRating}
            label="Rate the Driver"
          />

          {/* Driver Comment */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 text-gray-700">
              Comments about the Driver (Optional)
            </label>
            <textarea
              value={driverComment}
              onChange={(e) => setDriverComment(e.target.value)}
              placeholder="Share your thoughts about the driver..."
              className="w-full border rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          {/* Ride Rating */}
          <StarRating
            rating={rideRating}
            onRatingChange={setRideRating}
            label="Rate the Overall Ride"
          />

          {/* Ride Comment */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 text-gray-700">
              Comments about the Ride (Optional)
            </label>
            <textarea
              value={rideComment}
              onChange={(e) => setRideComment(e.target.value)}
              placeholder="Share your thoughts about the ride experience..."
              className="w-full border rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg font-semibold text-sm sm:text-base hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={submitting || driverRating === 0 || rideRating === 0}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Rating"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


"use client";
import { useState } from "react";

interface RideDocumentationFormProps {
  bookingId: string;
  onSubmit: (data: RideDocumentation) => Promise<void>;
  onCancel: () => void;
}

export interface RideDocumentation {
  rideQuality: "excellent" | "good" | "fair" | "poor";
  clientComfort:
    | "very_comfortable"
    | "comfortable"
    | "neutral"
    | "uncomfortable";
  accessibilityNotes: string;
  issuesReported: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function RideDocumentationForm({
  bookingId,
  onSubmit,
  onCancel,
}: RideDocumentationFormProps) {
  const [formData, setFormData] = useState<RideDocumentation>({
    rideQuality: "good",
    clientComfort: "comfortable",
    accessibilityNotes: "",
    issuesReported: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Failed to submit documentation:", error);
      alert("Failed to submit documentation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-[60]"
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">Document Ride Completion</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
          Please provide feedback about this ride to ensure quality service.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Ride Quality */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2">
              Overall Ride Quality <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {[
                { value: "excellent", label: "Excellent", emoji: "🌟" },
                { value: "good", label: "Good", emoji: "👍" },
                { value: "fair", label: "Fair", emoji: "👌" },
                { value: "poor", label: "Poor", emoji: "👎" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.rideQuality === option.value
                      ? "bg-blue-50 border-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="rideQuality"
                    value={option.value}
                    checked={formData.rideQuality === option.value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rideQuality: e.target.value as any,
                      })
                    }
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  />
                  <span className="text-lg sm:text-xl">{option.emoji}</span>
                  <span className="font-medium text-sm sm:text-base">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Client Comfort */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2">
              Client Comfort Level <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {[
                {
                  value: "very_comfortable",
                  label: "Very Comfortable",
                  emoji: "😊",
                },
                { value: "comfortable", label: "Comfortable", emoji: "🙂" },
                { value: "neutral", label: "Neutral", emoji: "😐" },
                { value: "uncomfortable", label: "Uncomfortable", emoji: "😟" },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.clientComfort === option.value
                      ? "bg-green-50 border-green-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="clientComfort"
                    value={option.value}
                    checked={formData.clientComfort === option.value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        clientComfort: e.target.value as any,
                      })
                    }
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  />
                  <span className="text-lg sm:text-xl">{option.emoji}</span>
                  <span className="font-medium text-sm sm:text-base">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Accessibility Notes */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2">
              Accessibility Notes
            </label>
            <textarea
              value={formData.accessibilityNotes}
              onChange={(e) =>
                setFormData({ ...formData, accessibilityNotes: e.target.value })
              }
              placeholder="Any notes about wheelchair access, mobility assistance, or other accessibility considerations..."
              className="w-full border rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          {/* Issues Reported */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2">
              Issues or Concerns
            </label>
            <textarea
              value={formData.issuesReported}
              onChange={(e) =>
                setFormData({ ...formData, issuesReported: e.target.value })
              }
              placeholder="Report any issues, concerns, or incidents during the ride (leave empty if none)..."
              className="w-full border rounded-lg p-2.5 sm:p-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
            <p className="text-xs text-gray-500 mt-1">
              This helps us maintain high quality service and address any
              problems.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg font-semibold text-sm sm:text-base hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Complete Ride"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

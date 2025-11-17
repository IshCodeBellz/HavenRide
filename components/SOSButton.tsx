"use client";
import { useState } from "react";

interface SOSButtonProps {
  onTrigger?: () => void;
}

export default function SOSButton({ onTrigger }: SOSButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const handleTriggerSOS = () => {
    setShowModal(true);
    if (onTrigger) onTrigger();
  };

  const handleCall999 = () => {
    window.location.href = "tel:999";
  };

  const handleContactSafety = () => {
    // TODO: Implement contact safety desk
    alert("Contacting HavenRide Safety Desk...");
  };

  const handleCancelAlert = () => {
    setShowModal(false);
  };

  return (
    <>
      {/* SOS Floating Button */}
      <button
        onClick={handleTriggerSOS}
        className="fixed w-16 h-16 bg-red-600 rounded-full shadow-lg hover:bg-red-700 transition-all hover:scale-110 z-50 flex items-center justify-center safe-area-sos"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
          right: 'calc(env(safe-area-inset-right, 0px) + 1.5rem)',
        }}
        title="Emergency SOS"
      >
        <span className="text-white font-bold text-lg">SOS</span>
      </button>

      {/* SOS Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            {/* SOS Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-3xl">SOS</span>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">
              Emergency in Progress
            </h2>

            {/* Description */}
            <p className="text-center text-gray-600 mb-6">
              Your location and driver details will be shared with HavenRide
              Safety Desk
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleCall999}
                className="w-full bg-red-600 text-white py-4 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
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
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                Call 999
              </button>

              <button
                onClick={handleContactSafety}
                className="w-full border-2 border-gray-300 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Contact HavenRide Safety Desk
              </button>

              <button
                onClick={handleCancelAlert}
                className="w-full border-2 border-gray-300 text-gray-700 py-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel Alert
              </button>
            </div>

            {/* Emergency Notice */}
            <p className="text-xs text-center text-gray-500 mt-6">
              In case of immediate danger, contact local emergency services.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

"use client";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import AppLayout from "@/components/AppLayout";
import RoleGate from "@/components/RoleGate";

function RiderSupportContent() {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueType, setIssueType] = useState("OTHER");
  const [issueSubject, setIssueSubject] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [issueBookingId, setIssueBookingId] = useState("");
  const [submittingIssue, setSubmittingIssue] = useState(false);

  const helpArticles = [
    {
      title: "How HavenRide Works",
      icon: "😊",
      description: "Learn about our accessible transportation service",
    },
    {
      title: "Refunds and Cancellations",
      icon: "♿",
      description: "Understanding our refund and cancellation policy",
    },
    {
      title: "Accessibility Assistance",
      icon: "📋",
      description: "Information about wheelchair access and mobility support",
    },
    {
      title: "Payment and Receipts",
      icon: "💳",
      description: "Managing payments, receipts, and billing",
    },
  ];

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0F3D3E] mb-2">
          Need help? We're here for you.
        </h1>
        <p className="text-gray-600">
          Find answers or contact our support team
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help articles..."
            className="w-full border border-gray-300 rounded-lg px-12 py-4 focus:outline-none focus:ring-2 focus:ring-[#00796B]"
          />
          <svg
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400"
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Help Articles */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-semibold text-[#0F3D3E] mb-4">
            Help Articles
          </h2>
          <div className="space-y-3">
            {helpArticles.map((article, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#E0F2F1] rounded-full flex items-center justify-center text-2xl">
                    {article.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#0F3D3E] mb-1">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {article.description}
                    </p>
                  </div>
                </div>
                <svg
                  className="w-6 h-6 text-gray-400"
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
            ))}
          </div>
        </div>

        {/* Contact Us */}
        <div>
          <h2 className="text-2xl font-semibold text-[#0F3D3E] mb-4">
            Contact Us
          </h2>
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
            <button className="w-full bg-[#00796B] text-white py-3 rounded-lg font-semibold hover:bg-[#00695C] transition-colors">
              Chat with Support
            </button>
            <button className="w-full border-2 border-[#00796B] text-[#00796B] py-3 rounded-lg font-semibold hover:bg-[#E0F2F1] transition-colors">
              Call Support
            </button>
            <button
              onClick={() => setShowIssueForm(true)}
              className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Report an Issue
            </button>
            <p className="text-sm text-gray-600 mt-4 text-center">
              Our team is available 24/7 to assist with your journey.
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Notice */}
      <div className="bg-[#0F3D3E] text-white rounded-2xl p-6 mt-8">
        <p className="text-center">
          For emergencies, please use the SOS option on your dashboard.
        </p>
      </div>

      {/* Issue Reporting Modal */}
      {showIssueForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-[#0F3D3E]">
                Report an Issue
              </h3>
              <button
                onClick={() => {
                  setShowIssueForm(false);
                  setIssueType("OTHER");
                  setIssueSubject("");
                  setIssueDescription("");
                  setIssueBookingId("");
                }}
                className="text-gray-400 hover:text-gray-600"
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

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!issueSubject || !issueDescription) {
                  alert("Please fill in subject and description");
                  return;
                }

                try {
                  setSubmittingIssue(true);
                  const res = await fetch("/api/riders/issues", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      type: issueType,
                      subject: issueSubject,
                      description: issueDescription,
                      bookingId: issueBookingId || null,
                      priority: issueType === "SAFETY" ? "URGENT" : "MEDIUM",
                    }),
                  });

                  if (res.ok) {
                    alert("Issue reported successfully! Our team will review it soon.");
                    setShowIssueForm(false);
                    setIssueType("OTHER");
                    setIssueSubject("");
                    setIssueDescription("");
                    setIssueBookingId("");
                  } else {
                    const errorData = await res.json();
                    alert(`Failed to report issue: ${errorData.error || "Unknown error"}`);
                  }
                } catch (error) {
                  console.error("Error reporting issue:", error);
                  alert("Failed to report issue");
                } finally {
                  setSubmittingIssue(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Type *
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00796B]"
                >
                  <option value="LOST_ITEM">Lost Item</option>
                  <option value="RIDE_ISSUE">Ride Issue</option>
                  <option value="PAYMENT_ISSUE">Payment Issue</option>
                  <option value="SAFETY">Safety Concern</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={issueSubject}
                  onChange={(e) => setIssueSubject(e.target.value)}
                  placeholder="Brief description of the issue"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00796B]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="Please provide details about the issue..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00796B]"
                  rows={5}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Related Booking ID (Optional)
                </label>
                <input
                  type="text"
                  value={issueBookingId}
                  onChange={(e) => setIssueBookingId(e.target.value)}
                  placeholder="If this issue is related to a specific ride"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00796B]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowIssueForm(false);
                    setIssueType("OTHER");
                    setIssueSubject("");
                    setIssueDescription("");
                    setIssueBookingId("");
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIssue || !issueSubject || !issueDescription}
                  className="flex-1 bg-[#00796B] text-white py-2 rounded-lg font-medium hover:bg-[#00695C] disabled:opacity-50"
                >
                  {submittingIssue ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RiderSupportPage() {
  return (
    <RoleGate requiredRole={["RIDER"]}>
      <AppLayout userRole="RIDER">
        <RiderSupportContent />
      </AppLayout>
    </RoleGate>
  );
}

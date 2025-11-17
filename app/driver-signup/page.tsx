"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, SignInButton } from "@clerk/nextjs";
import CenteredContainer from "@/components/CenteredContainer";

export default function DriverSignupPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    licenseNumber: "",
    vehicleType: "",
    hasWheelchairVehicle: false,
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // If user is signed in, assign driver role
      if (isSignedIn) {
        const res = await fetch("/api/users/assign-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "DRIVER" }),
        });

        if (res.ok) {
          router.push("/driver");
          return;
        }
      }

      // Otherwise, just show success message (you can send to backend/email later)
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  if (submitted && !isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50 py-20">
        <CenteredContainer>
          <div className="max-w-2xl mx-auto text-center bg-white rounded-2xl p-12 shadow-sm">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">✓</span>
            </div>
            <h1 className="text-3xl font-bold text-[#263238] mb-4">
              Application Submitted!
            </h1>
            <p className="text-lg text-neutral-600 mb-8">
              Thank you for your interest in joining HavenRide. Our team will
              review your application and get back to you within 2-3 business
              days.
            </p>
            <button
              onClick={() => router.push("/")}
              className="bg-[#5C7E9B] text-white px-10 py-4 rounded-xl font-semibold hover:bg-[#5C7E9B]/90 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </CenteredContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <CenteredContainer>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-[#263238] mb-4">
              Become a HavenRide Driver
            </h1>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              Join our team of compassionate drivers making accessible
              transportation available for everyone
            </p>
          </div>

          {/* Benefits Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <div className="w-16 h-16 bg-[#5C7E9B]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💰</span>
              </div>
              <h3 className="font-semibold text-[#263238] mb-2">
                Competitive Pay
              </h3>
              <p className="text-sm text-neutral-600">
                Earn fair rates with weekly payouts
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <div className="w-16 h-16 bg-[#5C7E9B]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📅</span>
              </div>
              <h3 className="font-semibold text-[#263238] mb-2">
                Flexible Schedule
              </h3>
              <p className="text-sm text-neutral-600">
                Choose your own hours and work when you want
              </p>
            </div>
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <div className="w-16 h-16 bg-[#5C7E9B]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">❤️</span>
              </div>
              <h3 className="font-semibold text-[#263238] mb-2">
                Make a Difference
              </h3>
              <p className="text-sm text-neutral-600">
                Provide essential service to your community
              </p>
            </div>
          </div>

          {/* Sign In Prompt if not signed in */}
          {!isSignedIn && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <span className="text-2xl">ℹ️</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#263238] mb-2">
                    Already have an account?
                  </h3>
                  <p className="text-sm text-neutral-600 mb-4">
                    Sign in to complete your driver application faster, or fill
                    out the form below and we'll contact you.
                  </p>
                  <SignInButton mode="modal">
                    <button className="bg-[#5C7E9B] text-white px-6 py-2 rounded-lg font-semibold text-sm hover:bg-[#5C7E9B]/90 transition-colors">
                      Sign In
                    </button>
                  </SignInButton>
                </div>
              </div>
            </div>
          )}

          {/* Application Form */}
          <div className="bg-white rounded-2xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-[#263238] mb-6">
              Driver Application
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#263238] mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C7E9B] focus:border-transparent"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#263238] mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C7E9B] focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#263238] mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C7E9B] focus:border-transparent"
                    placeholder="+44 7XXX XXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#263238] mb-2">
                    Driving License Number *
                  </label>
                  <input
                    type="text"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C7E9B] focus:border-transparent"
                    placeholder="License number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#263238] mb-2">
                  Vehicle Type *
                </label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C7E9B] focus:border-transparent"
                >
                  <option value="">Select vehicle type</option>
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="van">Van</option>
                  <option value="wheelchair-accessible">
                    Wheelchair Accessible Vehicle
                  </option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="hasWheelchairVehicle"
                  id="hasWheelchairVehicle"
                  checked={formData.hasWheelchairVehicle}
                  onChange={handleChange}
                  className="w-5 h-5 text-[#5C7E9B] border-gray-300 rounded focus:ring-[#5C7E9B]"
                />
                <label
                  htmlFor="hasWheelchairVehicle"
                  className="text-sm text-neutral-600"
                >
                  I have or can provide a wheelchair-accessible vehicle
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#263238] mb-2">
                  Tell us about yourself
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C7E9B] focus:border-transparent resize-none"
                  placeholder="Why do you want to drive with HavenRide?"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#5C7E9B] text-white px-10 py-4 rounded-xl font-semibold hover:bg-[#5C7E9B]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="px-10 py-4 border-2 border-gray-300 text-neutral-700 rounded-xl font-semibold hover:border-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* Requirements Section */}
          <div className="mt-12 bg-gray-100 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-[#263238] mb-4">
              Requirements
            </h3>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-3">
                <span className="text-[#5C7E9B] mt-1">✓</span>
                <span>
                  Valid UK driving license with at least 2 years experience
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#5C7E9B] mt-1">✓</span>
                <span>Clean driving record</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#5C7E9B] mt-1">✓</span>
                <span>Pass background check and DBS clearance</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#5C7E9B] mt-1">✓</span>
                <span>Vehicle must pass safety inspection</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#5C7E9B] mt-1">✓</span>
                <span>
                  Complete accessibility training (provided by HavenRide)
                </span>
              </li>
            </ul>
          </div>
        </div>
      </CenteredContainer>
    </div>
  );
}

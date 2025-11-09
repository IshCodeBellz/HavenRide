"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import AppLayout from "@/components/AppLayout";
import RoleGate from "@/components/RoleGate";

// Load Stripe outside of component
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

function CheckoutForm({ 
  amount, 
  pickup, 
  dropoff, 
  pickupLat, 
  pickupLng, 
  dropoffLat, 
  dropoffLng, 
  wheelchair,
  distanceKm,
  onSuccess 
}: {
  amount: string;
  pickup: string;
  dropoff: string;
  pickupLat: string;
  pickupLng: string;
  dropoffLat: string;
  dropoffLng: string;
  wheelchair: boolean;
  distanceKm: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useUser();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !user) {
      return;
    }

    setProcessing(true);
    setError("");

    try {
      // Submit the payment element
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "Payment failed");
        setProcessing(false);
        return;
      }

      // Confirm the payment with Stripe
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/rider`,
        },
        redirect: "if_required", // Don't redirect, handle it manually
      });

      if (confirmError) {
        console.error("Stripe confirmation error:", confirmError);
        setError(confirmError.message || "Payment failed. Please check your card details and try again.");
        setProcessing(false);
        return;
      }

      // Payment successful, now create the booking
      if (paymentIntent && paymentIntent.status === "succeeded") {
        const bookingRes = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            riderId: user.id,
            pickupAddress: pickup,
            dropoffAddress: dropoff,
            pickupTime: new Date(),
            pickupLat: parseFloat(pickupLat || "0"),
            pickupLng: parseFloat(pickupLng || "0"),
            dropoffLat: parseFloat(dropoffLat || "0"),
            dropoffLng: parseFloat(dropoffLng || "0"),
            requiresWheelchair: wheelchair,
            priceEstimate: {
              amount: parseFloat(amount || "0"),
              distanceKm: parseFloat(distanceKm || "0"),
            },
            paymentIntentId: paymentIntent.id,
          }),
        });

        if (bookingRes.ok) {
          onSuccess();
        } else {
          throw new Error("Failed to create booking");
        }
      } else {
        throw new Error("Payment was not completed");
      }
    } catch (e) {
      console.error(e);
      setError("Failed to process payment. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-[#00796B] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#00695C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Processing...
          </span>
        ) : (
          `Confirm & Pay £${parseFloat(amount || "0").toFixed(2)}`
        )}
      </button>

      {/* Cancel Button */}
      <button
        type="button"
        onClick={() => window.location.href = "/rider"}
        disabled={processing}
        className="w-full bg-red-50 text-red-600 border-2 border-red-200 py-4 rounded-xl font-semibold text-lg hover:bg-red-100 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-3"
      >
        Cancel Booking
      </button>
    </form>
  );
}

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get booking details from URL params
  const pickup = searchParams.get("pickup") || "";
  const dropoff = searchParams.get("dropoff") || "";
  const pickupLat = searchParams.get("pickupLat") || "";
  const pickupLng = searchParams.get("pickupLng") || "";
  const dropoffLat = searchParams.get("dropoffLat") || "";
  const dropoffLng = searchParams.get("dropoffLng") || "";
  const amount = searchParams.get("amount") || "";
  const distanceKm = searchParams.get("distanceKm") || "";
  const wheelchair = searchParams.get("wheelchair") === "true";

  // Create payment intent on mount
  useEffect(() => {
    if (!amount || !user) {
      setLoading(false);
      return;
    }

    async function createPaymentIntent() {
      try {
        console.log("Creating payment intent for amount:", amount);
        const paymentRes = await fetch("/api/payments/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Math.round(parseFloat(amount) * 100),
            currency: "gbp",
          }),
        });

        if (!paymentRes.ok) {
          const errorData = await paymentRes.text();
          console.error("Payment intent creation failed:", errorData);
          throw new Error("Failed to create payment intent");
        }

        const { clientSecret } = await paymentRes.json();
        console.log("Payment intent created successfully");
        setClientSecret(clientSecret);
      } catch (e) {
        console.error("Payment initialization error:", e);
        setError("Failed to initialize payment. Please try again or contact support.");
      } finally {
        setLoading(false);
      }
    }

    createPaymentIntent();
  }, [amount, user]);

  const handlePaymentSuccess = () => {
    router.push("/rider");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0F3D3E]">
            Confirm & Pay
          </h1>
          <p className="text-gray-600 mt-2">
            Review your ride details and confirm payment
          </p>
        </div>

        {/* Trip Details Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#0F3D3E] mb-4">
            Trip Details
          </h2>
          
          <div className="space-y-4">
            {/* Pickup */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#00796B] rounded-full flex items-center justify-center shrink-0 mt-1">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 font-medium">Pickup</p>
                <p className="text-sm font-semibold text-[#0F3D3E]">
                  {pickup}
                </p>
              </div>
            </div>

            {/* Dropoff */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#0F3D3E] rounded-full flex items-center justify-center shrink-0 mt-1">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 font-medium">Drop-off</p>
                <p className="text-sm font-semibold text-[#0F3D3E]">
                  {dropoff}
                </p>
              </div>
            </div>

            {/* Distance */}
            <div className="border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Distance</span>
                <span className="font-medium">~{distanceKm} km</span>
              </div>
              {wheelchair && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-700">
                  <span>♿</span>
                  <span>Wheelchair accessible vehicle</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Summary Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#0F3D3E] mb-4">
            Payment Summary
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Fare</span>
              <span className="font-medium">£{parseFloat(amount || "0").toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Service Fee</span>
              <span>Included</span>
            </div>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-lg font-semibold text-[#0F3D3E]">Total</span>
              <span className="text-2xl font-bold text-[#00796B]">
                £{parseFloat(amount || "0").toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method Card with Stripe Elements */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#0F3D3E] mb-4">
            Payment Method
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg
                className="animate-spin h-8 w-8 text-[#00796B]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          ) : clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#00796B",
                    colorBackground: "#ffffff",
                    colorText: "#0F3D3E",
                    colorDanger: "#df1b41",
                    fontFamily: "system-ui, sans-serif",
                    spacingUnit: "4px",
                    borderRadius: "8px",
                  },
                },
              }}
            >
              <CheckoutForm
                amount={amount}
                pickup={pickup}
                dropoff={dropoff}
                pickupLat={pickupLat}
                pickupLng={pickupLng}
                dropoffLat={dropoffLat}
                dropoffLng={dropoffLng}
                wheelchair={wheelchair}
                distanceKm={distanceKm}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
          ) : (
            <div className="text-center py-4 text-gray-500">
              Unable to load payment form
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p className="flex items-center justify-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Your payment is secure and encrypted
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.isAdmin || false);
        }
      } catch (error) {
        console.error("Failed to check admin status:", error);
      }
    }
    checkAdmin();
  }, []);

  return (
    <RoleGate requiredRole={["RIDER"]}>
      <AppLayout userRole="RIDER" isAdmin={isAdmin}>
        <PaymentPageContent />
      </AppLayout>
    </RoleGate>
  );
}

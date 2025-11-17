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
  voucherCode,
  voucherDiscount,
  selectedPaymentMethodId,
  savedPaymentMethods,
  clientSecret,
  onSuccess,
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
  voucherCode: string | null;
  voucherDiscount: number;
  selectedPaymentMethodId: string | null;
  savedPaymentMethods: SavedPaymentMethod[];
  clientSecret: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useUser();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !user) {
      setError("Payment system not ready. Please wait a moment and try again.");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      let paymentIntent;

      // If using a saved payment method
      if (selectedPaymentMethodId && selectedPaymentMethodId !== "new") {
        const savedMethod = savedPaymentMethods.find(
          (m) => m.id === selectedPaymentMethodId
        );
        
        if (!savedMethod) {
          setError("Selected payment method not found");
          setProcessing(false);
          return;
        }

        // Get the rider's Stripe customer ID to ensure payment method is attached
        const riderRes = await fetch("/api/riders/stripe-customer");
        let customerId: string | undefined;
        if (riderRes.ok) {
          const riderData = await riderRes.json();
          customerId = riderData.stripeCustomerId;
        }

        // If we don't have a customer ID, the payment intent creation should have created one
        // But let's make sure the payment method is attached before confirming
        if (customerId) {
          try {
            // Attach the payment method to the customer (idempotent - won't fail if already attached)
            const attachRes = await fetch("/api/payments/attach-payment-method", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentMethodId: savedMethod.stripePaymentMethodId,
                customerId: customerId,
              }),
            });

            if (!attachRes.ok) {
              const attachError = await attachRes.json().catch(() => ({}));
              console.error("Failed to attach payment method:", attachError);
              // Continue anyway - might already be attached
            }
          } catch (attachError) {
            console.warn("Could not attach payment method:", attachError);
            // Continue anyway - might already be attached
          }
        } else {
          // If no customer ID, we need to get it from the payment intent
          // The payment intent should have a customer since we always create one now
          console.warn("No customer ID found, but payment intent should have one");
        }

        // Confirm payment with saved payment method
        // The payment intent already has the customer, so the payment method should work
        const { error: confirmError, paymentIntent: intent } =
          await stripe.confirmPayment({
            clientSecret: clientSecret,
            confirmParams: {
              payment_method: savedMethod.stripePaymentMethodId,
              return_url: `${window.location.origin}/rider`,
            },
            redirect: "if_required",
          });

        if (confirmError) {
          setError(confirmError.message || "Payment failed");
          setProcessing(false);
          return;
        }

        paymentIntent = intent;
      } else {
        // Using new payment method from PaymentElement
        if (!elements) {
          setError("Payment form not loaded. Please wait a moment and try again.");
          setProcessing(false);
          return;
        }

        // Check if PaymentElement is mounted
        const paymentElement = elements.getElement('payment');
        if (!paymentElement) {
          setError("Payment form is not ready. Please wait a moment and try again.");
          setProcessing(false);
          return;
        }

        // Submit the payment element
        const { error: submitError } = await elements.submit();
        if (submitError) {
          setError(submitError.message || "Payment failed");
          setProcessing(false);
          return;
        }

        // Confirm the payment with Stripe
        const { error: confirmError, paymentIntent: intent } =
          await stripe.confirmPayment({
            elements,
            confirmParams: {
              return_url: `${window.location.origin}/rider`,
            },
            redirect: "if_required", // Don't redirect, handle it manually
          });

        if (confirmError) {
          setError(confirmError.message || "Payment failed");
          setProcessing(false);
          return;
        }

        paymentIntent = intent;
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
            voucherCode: voucherCode || null,
            voucherDiscount: voucherDiscount || 0,
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
      {selectedPaymentMethodId === "new" || selectedPaymentMethodId === null ? (
        <PaymentElement />
      ) : null}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-[#5C7E9B] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#4A6B85] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
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
        onClick={() => (window.location.href = "/rider")}
        disabled={processing}
        className="w-full bg-red-50 text-red-600 border-2 border-red-200 py-4 rounded-xl font-semibold text-lg hover:bg-red-100 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-3"
      >
        Cancel Booking
      </button>
    </form>
  );
}

interface SavedPaymentMethod {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  stripePaymentMethodId: string;
}

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState("");
  const [voucherApplied, setVoucherApplied] = useState(false);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("new");
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);

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

  // Fetch saved payment methods
  useEffect(() => {
    async function fetchPaymentMethods() {
      try {
        const res = await fetch("/api/riders/payment-methods");
        if (res.ok) {
          const methods = await res.json();
          setSavedPaymentMethods(methods);
          // Set default payment method if available
          const defaultMethod = methods.find((m: SavedPaymentMethod) => m.isDefault);
          if (defaultMethod) {
            setSelectedPaymentMethod(defaultMethod.id);
          }
        }
      } catch (error) {
        console.error("Error fetching payment methods:", error);
      } finally {
        setLoadingPaymentMethods(false);
      }
    }
    fetchPaymentMethods();
  }, []);

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
          const errorData = await paymentRes.json().catch(() => ({ error: "Unknown error" }));
          console.error("Payment intent creation failed:", errorData);
          throw new Error(errorData.details || errorData.error || "Failed to create payment intent");
        }

        const { clientSecret } = await paymentRes.json();
        console.log("Payment intent created successfully");
        setClientSecret(clientSecret);
      } catch (e) {
        console.error("Payment initialization error:", e);
        const errorMessage = e instanceof Error ? e.message : "Unknown error";
        setError(
          `Failed to initialize payment: ${errorMessage}. Please try again or contact support.`
        );
      } finally {
        setLoading(false);
      }
    }

    createPaymentIntent();
  }, [amount, user]);

  const handlePaymentSuccess = () => {
    router.push("/rider");
  };

  async function handleValidateVoucher() {
    if (!voucherCode.trim()) {
      setVoucherError("Please enter a voucher code");
      return;
    }

    try {
      setValidatingVoucher(true);
      setVoucherError("");
      
      const res = await fetch("/api/vouchers/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: voucherCode.trim(),
          fareAmount: parseFloat(amount || "0"),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setVoucherDiscount(data.discountAmount);
        setVoucherApplied(true);
        setVoucherError("");
      } else {
        const errorData = await res.json();
        setVoucherError(errorData.error || "Invalid voucher code");
        setVoucherDiscount(0);
        setVoucherApplied(false);
      }
    } catch (error) {
      console.error("Error validating voucher:", error);
      setVoucherError("Failed to validate voucher code");
      setVoucherDiscount(0);
      setVoucherApplied(false);
    } finally {
      setValidatingVoucher(false);
    }
  }

  const finalAmount = Math.max(0, parseFloat(amount || "0") - voucherDiscount);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#5C7E9B]">Confirm & Pay</h1>
          <p className="text-gray-600 mt-2">
            Review your ride details and confirm payment
          </p>
        </div>

        {/* Trip Details Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#5C7E9B] mb-4">
            Trip Details
          </h2>

          <div className="space-y-4">
            {/* Pickup */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#5C7E9B] rounded-full flex items-center justify-center shrink-0 mt-1">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 font-medium">Pickup</p>
                <p className="text-sm font-semibold text-[#5C7E9B]">{pickup}</p>
              </div>
            </div>

            {/* Dropoff */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#5C7E9B] rounded-full flex items-center justify-center shrink-0 mt-1">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 font-medium">Drop-off</p>
                <p className="text-sm font-semibold text-[#5C7E9B]">
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
          <h2 className="text-xl font-semibold text-[#5C7E9B] mb-4">
            Payment Summary
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Base Fare</span>
              <span className="font-medium">
                £{parseFloat(amount || "0").toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Service Fee</span>
              <span>Included</span>
            </div>
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="text-lg font-semibold text-[#5C7E9B]">
                Total
              </span>
              <span className="text-2xl font-bold text-[#5C7E9B]">
                £{parseFloat(amount || "0").toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method Card with Stripe Elements */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#5C7E9B] mb-4">
            Payment Method
          </h2>

          {/* Payment Method Selection */}
          {!loadingPaymentMethods && savedPaymentMethods.length > 0 && (
            <div className="mb-4 space-y-2">
              {savedPaymentMethods.map((method) => (
                <label
                  key={method.id}
                  className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedPaymentMethod === method.id
                      ? "border-[#5C7E9B] bg-[#E0D5DB]"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={selectedPaymentMethod === method.id}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="w-4 h-4 text-[#5C7E9B] border-gray-300 focus:ring-[#5C7E9B]"
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-xs uppercase">
                        {method.brand}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {method.brand} ending in {method.last4}
                      </p>
                      <p className="text-sm text-gray-500">
                        Expires {method.expiryMonth}/{method.expiryYear}
                        {method.isDefault && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Default
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
              
              <label
                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedPaymentMethod === "new"
                    ? "border-[#5C7E9B] bg-[#E0D5DB]"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="new"
                  checked={selectedPaymentMethod === "new"}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  className="w-4 h-4 text-[#5C7E9B] border-gray-300 focus:ring-[#5C7E9B]"
                />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <p className="font-medium">Add new card</p>
                </div>
              </label>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg
                className="animate-spin h-8 w-8 text-[#5C7E9B]"
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
                    colorPrimary: "#5C7E9B",
                    colorBackground: "#ffffff",
                    colorText: "#5C7E9B",
                    colorDanger: "#df1b41",
                    fontFamily: "system-ui, sans-serif",
                    spacingUnit: "4px",
                    borderRadius: "8px",
                  },
                },
              }}
            >
              <CheckoutForm
                amount={finalAmount.toString()}
                pickup={pickup}
                dropoff={dropoff}
                pickupLat={pickupLat}
                pickupLng={pickupLng}
                dropoffLat={dropoffLat}
                dropoffLng={dropoffLng}
                wheelchair={wheelchair}
                distanceKm={distanceKm}
                voucherCode={voucherApplied ? voucherCode : null}
                voucherDiscount={voucherDiscount}
                selectedPaymentMethodId={selectedPaymentMethod === "new" ? null : selectedPaymentMethod}
                savedPaymentMethods={savedPaymentMethods}
                clientSecret={clientSecret}
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

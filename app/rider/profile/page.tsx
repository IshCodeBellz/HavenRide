"use client";
import { useState, useEffect } from "react";
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
import MapboxAutocomplete from "@/components/MapboxAutocomplete";

// Load Stripe outside of component
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

interface SavedLocation {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface PaymentMethod {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

// Payment Method Form Component
function AddPaymentMethodForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError("");

    try {
      // Submit the payment element
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "Failed to submit card details");
        setProcessing(false);
        return;
      }

      // Confirm the setup intent
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message || "Failed to save card");
        setProcessing(false);
        return;
      }

      if (setupIntent && setupIntent.payment_method) {
        // Get payment method details from server
        const pmRes = await fetch("/api/payments/retrieve-payment-method", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethodId: setupIntent.payment_method as string,
          }),
        });

        if (!pmRes.ok) {
          const errorData = await pmRes.json().catch(() => ({}));
          setError(errorData.error || "Failed to retrieve card details");
          setProcessing(false);
          return;
        }

        const pm = await pmRes.json();

        // Save payment method to database
        const res = await fetch("/api/riders/payment-methods", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stripePaymentMethodId: pm.id,
            last4: pm.last4,
            brand: pm.brand,
            expiryMonth: pm.expiryMonth,
            expiryYear: pm.expiryYear,
            isDefault: false, // New cards are not default by default
          }),
        });

        if (res.ok) {
          onSuccess();
        } else {
          const errorData = await res.json().catch(() => ({}));
          setError(errorData.error || "Failed to save payment method");
        }
      }
    } catch (err) {
      console.error("Error saving payment method:", err);
      setError("An unexpected error occurred");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="text-red-600 text-sm mt-2">{error}</div>
      )}
      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 bg-[#00796B] text-white py-2 rounded-lg font-medium hover:bg-[#00695C] disabled:opacity-50"
        >
          {processing ? "Saving..." : "Save Card"}
        </button>
      </div>
    </form>
  );
}

function RiderProfileContent() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  // Preferences
  const [alwaysWheelchair, setAlwaysWheelchair] = useState(false);
  const [needsAssistance, setNeedsAssistance] = useState(false);
  
  // Saved locations and payment methods
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  // Emergency contacts
  interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    relationship: string | null;
    isPrimary: boolean;
  }
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [showAddEmergencyContact, setShowAddEmergencyContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newContactRelationship, setNewContactRelationship] = useState("");
  const [newContactIsPrimary, setNewContactIsPrimary] = useState(false);
  const [addingContact, setAddingContact] = useState(false);
  
  // Add location modal
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocationLabel, setNewLocationLabel] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [newLocationCoords, setNewLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [addingLocation, setAddingLocation] = useState(false);
  
  // Add payment method modal
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [setupIntentClientSecret, setSetupIntentClientSecret] = useState<string | null>(null);
  const [addingPaymentMethod, setAddingPaymentMethod] = useState(false);
  
  // Profile picture
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Fetch all profile data on mount
  useEffect(() => {
    fetchProfileData();
  }, []);

  async function fetchProfileData() {
    try {
      setLoading(true);
      
      // Fetch profile
      const profileRes = await fetch("/api/riders/profile");
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setName(profileData.name || "");
        setEmail(profileData.email || "");
        setPhone(profileData.phone || "");
        setImageUrl(profileData.imageUrl || null);
      }
      
      // Fetch preferences
      const prefsRes = await fetch("/api/riders/preferences");
      if (prefsRes.ok) {
        const prefsData = await prefsRes.json();
        setAlwaysWheelchair(prefsData.alwaysRequestWheelchair || false);
        setNeedsAssistance(prefsData.needsAssistance || false);
      }
      
      // Fetch saved locations
      const locationsRes = await fetch("/api/riders/saved-locations");
      if (locationsRes.ok) {
        const locationsData = await locationsRes.json();
        setSavedLocations(locationsData);
      }
      
      // Fetch payment methods
      const paymentsRes = await fetch("/api/riders/payment-methods");
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPaymentMethods(paymentsData);
      }
      
      // Fetch emergency contacts
      const contactsRes = await fetch("/api/riders/emergency-contacts");
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        setEmergencyContacts(contactsData);
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    try {
      setSaving(true);
      
      // Update profile
      const profileRes = await fetch("/api/riders/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      
      if (!profileRes.ok) {
        const errorData = await profileRes.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Failed to update profile");
      }
      
      // Update preferences
      const prefsRes = await fetch("/api/riders/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alwaysRequestWheelchair: alwaysWheelchair,
          needsAssistance: needsAssistance,
          phone,
        }),
      });
      
      if (!prefsRes.ok) {
        const errorData = await prefsRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update preferences");
      }
      
      // Refresh profile data to show updated values
      await fetchProfileData();
      
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert(`Failed to update profile: ${error instanceof Error ? error.message : "Please try again."}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddLocation() {
    if (!newLocationLabel || !newLocationAddress || !newLocationCoords) {
      alert("Please fill in all fields and select a valid address");
      return;
    }
    
    try {
      setAddingLocation(true);
      
      const res = await fetch("/api/riders/saved-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLocationLabel,
          address: newLocationAddress,
          latitude: newLocationCoords.lat,
          longitude: newLocationCoords.lng,
        }),
      });
      
      if (res.ok) {
        const newLocation = await res.json();
        setSavedLocations([...savedLocations, newLocation]);
        setShowAddLocation(false);
        setNewLocationLabel("");
        setNewLocationAddress("");
        setNewLocationCoords(null);
        alert("Location added successfully!");
      } else {
        const errorData = await res.json();
        console.error("API error:", errorData);
        alert(`Failed to add location: ${errorData.details || errorData.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error adding location:", error);
      alert(`Failed to add location: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setAddingLocation(false);
    }
  }

  async function handleDeleteLocation(id: string) {
    if (!confirm("Are you sure you want to delete this location?")) return;
    
    try {
      const res = await fetch(`/api/riders/saved-locations/${id}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        setSavedLocations(savedLocations.filter(loc => loc.id !== id));
      }
    } catch (error) {
      console.error("Error deleting location:", error);
      alert("Failed to delete location");
    }
  }

  async function handleDeletePaymentMethod(id: string) {
    if (!confirm("Are you sure you want to remove this payment method?")) return;
    
    try {
      const res = await fetch(`/api/riders/payment-methods/${id}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        setPaymentMethods(paymentMethods.filter(pm => pm.id !== id));
      }
    } catch (error) {
      console.error("Error deleting payment method:", error);
      alert("Failed to delete payment method");
    }
  }

  async function handleAddEmergencyContact() {
    if (!newContactName || !newContactPhone) {
      alert("Please fill in name and phone number");
      return;
    }
    
    try {
      setAddingContact(true);
      
      const res = await fetch("/api/riders/emergency-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newContactName,
          phone: newContactPhone,
          relationship: newContactRelationship || null,
          isPrimary: newContactIsPrimary,
        }),
      });
      
      if (res.ok) {
        const newContact = await res.json();
        setEmergencyContacts([...emergencyContacts, newContact]);
        setShowAddEmergencyContact(false);
        setNewContactName("");
        setNewContactPhone("");
        setNewContactRelationship("");
        setNewContactIsPrimary(false);
        alert("Emergency contact added successfully!");
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || "Unknown error";
        console.error("API error:", errorData);
        alert(`Failed to add contact: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Error adding emergency contact:", error);
      alert("Failed to add emergency contact");
    } finally {
      setAddingContact(false);
    }
  }

  async function handleDeleteEmergencyContact(id: string) {
    if (!confirm("Are you sure you want to delete this emergency contact?")) return;
    
    try {
      const res = await fetch(`/api/riders/emergency-contacts/${id}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        setEmergencyContacts(emergencyContacts.filter(ec => ec.id !== id));
      }
    } catch (error) {
      console.error("Error deleting emergency contact:", error);
      alert("Failed to delete emergency contact");
    }
  }

  async function handleOpenAddPaymentMethod() {
    try {
      setShowAddPaymentMethod(true);
      const res = await fetch("/api/payments/create-setup-intent", {
        method: "POST",
      });
      
      if (res.ok) {
        const { clientSecret } = await res.json();
        setSetupIntentClientSecret(clientSecret);
      } else {
        alert("Failed to initialize payment form. Please try again.");
        setShowAddPaymentMethod(false);
      }
    } catch (error) {
      console.error("Error creating setup intent:", error);
      alert("Failed to initialize payment form. Please try again.");
      setShowAddPaymentMethod(false);
    }
  }

  function handleCloseAddPaymentMethod() {
    setShowAddPaymentMethod(false);
    setSetupIntentClientSecret(null);
  }

  function handleChangePhotoClick() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size must be less than 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file");
        return;
      }

      setUploadingPhoto(true);
      try {
        // Upload file directly using FormData
        const formData = new FormData();
        formData.append("file", file);
        
        const res = await fetch("/api/riders/profile/photo/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          alert(errorData.error || "Failed to upload profile picture");
          setUploadingPhoto(false);
          return;
        }

        const uploadData = await res.json();
        const imageUrl = `${window.location.origin}${uploadData.imageUrl}`;
        
        console.log("Image uploaded, URL:", imageUrl);
        
        // Save image URL to database (Clerk update may fail for localhost URLs, but that's okay)
        const updateRes = await fetch("/api/riders/profile/photo", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl }),
        });

        const responseData = await updateRes.json().catch(() => ({}));
        
        if (updateRes.ok && responseData.success) {
          const savedImageUrl = responseData.imageUrl || imageUrl;
          console.log("Image URL saved to database:", savedImageUrl);
          
          // Set the image URL immediately so it displays
          setImageUrl(savedImageUrl);
          
          // Refresh profile data to get the updated image from database
          await fetchProfileData();
          
          alert("Profile picture updated successfully!");
          
          // Small delay before reload to ensure state is updated
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } else {
          console.error("Failed to save image URL. Status:", updateRes.status, "Response:", responseData);
          const errorMsg = responseData.details || responseData.error || `HTTP ${updateRes.status}: ${updateRes.statusText}`;
          alert(`Failed to update profile picture: ${errorMsg}`);
        }
        setUploadingPhoto(false);
      } catch (error) {
        console.error("Error uploading photo:", error);
        alert("Failed to upload photo");
        setUploadingPhoto(false);
      }
    };
    input.click();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0F3D3E]">Your Account</h1>
        <p className="text-gray-600">Manage your details and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0F3D3E] mb-6">
            Profile Information
          </h2>

          <div className="flex items-center gap-4 mb-6">
            {(imageUrl || user?.imageUrl) ? (
              <img
                key={imageUrl || user?.imageUrl} // Force re-render when URL changes
                src={imageUrl || user?.imageUrl || ""}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => {
                  console.error("Image failed to load:", imageUrl || user?.imageUrl);
                  // Hide image and show initials
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    e.currentTarget.style.display = "none";
                    const fallback = document.createElement("div");
                    fallback.className = "w-20 h-20 bg-[#0F3D3E] rounded-full flex items-center justify-center text-white text-2xl font-bold absolute";
                    fallback.textContent = user?.firstName?.charAt(0) || "U";
                    parent.appendChild(fallback);
                  }
                }}
                onLoad={() => {
                  console.log("Image loaded successfully:", imageUrl || user?.imageUrl);
                }}
              />
            ) : null}
            {(!imageUrl && !user?.imageUrl) && (
              <div className="w-20 h-20 bg-[#0F3D3E] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {user?.firstName?.charAt(0) || "U"}
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Profile Picture</p>
              <button
                onClick={handleChangePhotoClick}
                disabled={uploadingPhoto}
                className="text-[#00796B] text-sm font-medium hover:underline disabled:opacity-50"
              >
                {uploadingPhoto ? "Uploading..." : "Change Photo"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00796B]"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00796B]"
                placeholder="johndoe@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00796B]"
                placeholder="+44 7911 123456"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full bg-[#00796B] text-white py-3 rounded-lg font-semibold hover:bg-[#00695C] transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Saved Locations */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#0F3D3E]">
              Saved Locations
            </h2>
            <button
              onClick={() => setShowAddLocation(true)}
              className="text-[#00796B] hover:text-[#00695C] font-medium text-sm flex items-center gap-1"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Location
            </button>
          </div>

          {savedLocations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No saved locations yet</p>
              <p className="text-sm">Add locations for quick booking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedLocations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#E0F2F1] rounded-full flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-[#00796B]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">{location.label}</p>
                      <p className="text-sm text-gray-500">{location.address}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteLocation(location.id)}
                    className="text-red-600 hover:text-red-700"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Emergency Contacts */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#0F3D3E]">
              Emergency Contacts
            </h2>
            <button
              onClick={() => setShowAddEmergencyContact(true)}
              className="text-[#00796B] hover:text-[#00695C] font-medium text-sm flex items-center gap-1"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Contact
            </button>
          </div>

          {emergencyContacts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No emergency contacts added</p>
              <p className="text-sm">Add contacts for safety and peace of mind</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emergencyContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{contact.name}</p>
                        {contact.isPrimary && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{contact.phone}</p>
                      {contact.relationship && (
                        <p className="text-xs text-gray-400 capitalize">
                          {contact.relationship}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEmergencyContact(contact.id)}
                    className="text-red-600 hover:text-red-700"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accessibility Preferences */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0F3D3E] mb-6">
            Accessibility Preferences
          </h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={alwaysWheelchair}
                onChange={(e) => setAlwaysWheelchair(e.target.checked)}
                className="w-5 h-5 text-[#00796B] border-gray-300 rounded focus:ring-[#00796B]"
              />
              <div>
                <p className="font-medium text-gray-900">
                  Always request wheelchair-accessible vehicle
                </p>
                <p className="text-sm text-gray-500">
                  All rides will be booked with wheelchair access by default
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={needsAssistance}
                onChange={(e) => setNeedsAssistance(e.target.checked)}
                className="w-5 h-5 text-[#00796B] border-gray-300 rounded focus:ring-[#00796B]"
              />
              <div>
                <p className="font-medium text-gray-900">
                  Needs assistance entering vehicle
                </p>
                <p className="text-sm text-gray-500">
                  Driver will be notified to provide extra assistance
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0F3D3E] mb-6">
            Payment Methods
          </h2>

          {paymentMethods.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No payment methods added</p>
              <p className="text-sm">Add a card to book rides</p>
            </div>
          ) : (
            <div className="space-y-3 mb-4">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-xs uppercase">
                          {method.brand}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">Card ending in {method.last4}</p>
                        <p className="text-sm text-gray-500">
                          Expires {method.expiryMonth}/{method.expiryYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {method.isDefault && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Default
                        </span>
                      )}
                      <button
                        onClick={() => handleDeletePaymentMethod(method.id)}
                        className="text-red-600 hover:text-red-700"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-sm text-gray-500 mb-4">
            All data is securely stored in compliance with GDPR.
          </p>

          <button
            onClick={handleOpenAddPaymentMethod}
            className="w-full bg-[#00796B] text-white py-3 rounded-lg font-semibold hover:bg-[#00695C] transition-colors"
          >
            Add New Card
          </button>
        </div>
      </div>

      {/* Add Location Modal */}
      {showAddLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-[#0F3D3E]">
                Add Saved Location
              </h3>
              <button
                onClick={() => {
                  setShowAddLocation(false);
                  setNewLocationLabel("");
                  setNewLocationAddress("");
                  setNewLocationCoords(null);
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select a type
                </label>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button
                    onClick={() => setNewLocationLabel("Home")}
                    className={`p-3 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      newLocationLabel === "Home"
                        ? "border-[#00796B] bg-[#E0F2F1]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <svg
                      className="w-6 h-6 text-[#00796B]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                    <span className="text-sm font-medium">Home</span>
                  </button>

                  <button
                    onClick={() => setNewLocationLabel("Work")}
                    className={`p-3 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      newLocationLabel === "Work"
                        ? "border-[#00796B] bg-[#E0F2F1]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <svg
                      className="w-6 h-6 text-[#00796B]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-sm font-medium">Work</span>
                  </button>

                  <button
                    onClick={() => setNewLocationLabel("Hospital")}
                    className={`p-3 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      newLocationLabel === "Hospital"
                        ? "border-[#00796B] bg-[#E0F2F1]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <svg
                      className="w-6 h-6 text-[#00796B]"
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
                    <span className="text-sm font-medium">Hospital</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={newLocationLabel}
                  onChange={(e) => setNewLocationLabel(e.target.value)}
                  placeholder="Or enter custom label"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00796B]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <MapboxAutocomplete
                  value={newLocationAddress}
                  onChange={(address, coords) => {
                    setNewLocationAddress(address);
                    setNewLocationCoords(coords);
                  }}
                  placeholder="Enter address"
                  label=""
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddLocation(false);
                    setNewLocationLabel("");
                    setNewLocationAddress("");
                    setNewLocationCoords(null);
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLocation}
                  disabled={addingLocation || !newLocationLabel || !newLocationAddress || !newLocationCoords}
                  className="flex-1 bg-[#00796B] text-white py-2 rounded-lg font-medium hover:bg-[#00695C] disabled:opacity-50"
                >
                  {addingLocation ? "Adding..." : "Add Location"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Emergency Contact Modal */}
      {showAddEmergencyContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-[#0F3D3E]">
                Add Emergency Contact
              </h3>
              <button
                onClick={() => {
                  setShowAddEmergencyContact(false);
                  setNewContactName("");
                  setNewContactPhone("");
                  setNewContactRelationship("");
                  setNewContactIsPrimary(false);
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

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00796B]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="+44 7911 123456"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00796B]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship
                </label>
                <select
                  value={newContactRelationship}
                  onChange={(e) => setNewContactRelationship(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#00796B]"
                >
                  <option value="">Select relationship</option>
                  <option value="family">Family</option>
                  <option value="friend">Friend</option>
                  <option value="carer">Carer</option>
                  <option value="medical">Medical Professional</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={newContactIsPrimary}
                  onChange={(e) => setNewContactIsPrimary(e.target.checked)}
                  className="w-4 h-4 text-[#00796B] border-gray-300 rounded focus:ring-[#00796B]"
                />
                <label htmlFor="isPrimary" className="text-sm text-gray-700">
                  Set as primary emergency contact
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddEmergencyContact(false);
                    setNewContactName("");
                    setNewContactPhone("");
                    setNewContactRelationship("");
                    setNewContactIsPrimary(false);
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEmergencyContact}
                  disabled={addingContact || !newContactName || !newContactPhone}
                  className="flex-1 bg-[#00796B] text-white py-2 rounded-lg font-medium hover:bg-[#00695C] disabled:opacity-50"
                >
                  {addingContact ? "Adding..." : "Add Contact"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Method Modal */}
      {showAddPaymentMethod && setupIntentClientSecret && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-[#0F3D3E]">
                Add Payment Method
              </h3>
              <button
                onClick={handleCloseAddPaymentMethod}
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

            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: setupIntentClientSecret,
                appearance: {
                  theme: "stripe",
                },
              }}
            >
              <AddPaymentMethodForm
                onSuccess={async () => {
                  handleCloseAddPaymentMethod();
                  await fetchProfileData();
                  alert("Payment method added successfully!");
                }}
                onCancel={handleCloseAddPaymentMethod}
              />
            </Elements>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RiderProfilePage() {
  return (
    <RoleGate requiredRole={["RIDER"]}>
      <AppLayout userRole="RIDER">
        <RiderProfileContent />
      </AppLayout>
    </RoleGate>
  );
}

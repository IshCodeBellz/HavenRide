"use client";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import RoleGate from "@/components/RoleGate";

interface DriverDocument {
  id: string;
  documentType: string;
  documentUrl: string;
  status: string;
  uploadedAt: string;
  expiryDate?: string;
  notes?: string;
}

function DriverProfileContent() {
  const { user } = useUser();
  
  // Profile fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  const [vehicle, setVehicle] = useState({
    make: "",
    model: "",
    plate: "",
    wheelchairCapable: false,
  });
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    documentType: "",
    file: null as File | null,
    expiryDate: "",
  });
  const [verificationStatus, setVerificationStatus] = useState("PENDING");
  const [verificationDetails, setVerificationDetails] = useState<{
    [key: string]: string;
  }>({});

  useEffect(() => {
    fetchDriverData();
    fetchDocuments();
  }, [user?.id]);

  async function fetchDriverData() {
    try {
      // Fetch driver profile data
      const res = await fetch("/api/drivers/profile");
      if (res.ok) {
        const data = await res.json();
        setVehicle({
          make: data.vehicleMake || "",
          model: data.vehicleModel || "",
          plate: data.vehiclePlate || "",
          wheelchairCapable: data.wheelchairCapable || false,
        });
        setPhone(data.phone || "");
        setVerificationStatus(data.verificationStatus || "PENDING");
      }
      
      // Fetch user profile data (name, email, image)
      const userRes = await fetch("/api/users/me");
      if (userRes.ok) {
        const userData = await userRes.json();
        setName(userData.name || user?.fullName || "");
        setEmail(userData.email || user?.emailAddresses[0]?.emailAddress || "");
        setImageUrl(userData.imageUrl || null);
      }
    } catch (error) {
      console.error("Failed to fetch driver data:", error);
    }
  }

  async function fetchDocuments() {
    try {
      const res = await fetch("/api/drivers/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
        
        // Determine overall verification status
        if (data.documents.length === 0) {
          setVerificationStatus("PENDING");
        } else if (data.documents.every((d: DriverDocument) => d.status === "APPROVED")) {
          setVerificationStatus("APPROVED");
        } else if (data.documents.some((d: DriverDocument) => d.status === "REJECTED")) {
          setVerificationStatus("REJECTED");
        } else {
          setVerificationStatus("PENDING");
        }

        // Create per-document status map
        const details: { [key: string]: string } = {};
        data.documents.forEach((doc: DriverDocument) => {
          details[doc.documentType] = doc.status;
        });
        setVerificationDetails(details);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadDocument() {
    if (!uploadForm.documentType || !uploadForm.file) {
      alert("Please select a document type and file");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadForm.file);
      formData.append("documentType", uploadForm.documentType);
      if (uploadForm.expiryDate) {
        formData.append("expiryDate", uploadForm.expiryDate);
      }

      const res = await fetch("/api/drivers/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        alert("Document uploaded successfully! It will be reviewed by our team.");
        setUploadForm({ documentType: "", file: null, expiryDate: "" });
        setShowUploadForm(false);
        fetchDocuments();
      } else {
        const error = await res.json();
        alert(error.error || error.details || "Failed to upload document");
      }
    } catch (error) {
      console.error("Failed to upload document:", error);
      alert("An error occurred while uploading the document");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      // Update user profile (name, email)
      const profileRes = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      if (!profileRes.ok) {
        const errorData = await profileRes.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Failed to update profile");
      }

      // Update driver profile (vehicle, phone)
      const driverRes = await fetch("/api/drivers/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleMake: vehicle.make,
          vehicleModel: vehicle.model,
          vehiclePlate: vehicle.plate,
          wheelchairCapable: vehicle.wheelchairCapable,
          phone: phone,
        }),
      });

      if (!driverRes.ok) {
        const errorData = await driverRes.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Failed to update driver profile");
      }

      // Refresh data
      await fetchDriverData();
      
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Failed to save profile:", error);
      alert(`Failed to update profile: ${error instanceof Error ? error.message : "Please try again."}`);
    } finally {
      setSaving(false);
    }
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
        
        const res = await fetch("/api/drivers/profile/photo/upload", {
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
        
        // Save image URL to database
        const updateRes = await fetch("/api/drivers/profile/photo", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl }),
        });

        const responseData = await updateRes.json().catch(() => ({}));
        
        if (updateRes.ok && responseData.success) {
          const savedImageUrl = responseData.imageUrl || imageUrl;
          setImageUrl(savedImageUrl);
          await fetchDriverData();
          alert("Profile picture updated successfully!");
          setTimeout(() => {
            window.location.reload();
          }, 500);
        } else {
          const errorMsg = responseData.details || responseData.error || "Failed to update profile picture";
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-700";
      case "REJECTED":
        return "bg-red-100 text-red-700";
      case "EXPIRED":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      LICENSE: "Driving License",
      INSURANCE: "Insurance Certificate",
      DBS: "DBS Check",
      TRAINING: "Training Certificate",
      VEHICLE_REGISTRATION: "Vehicle Registration",
    };
    return labels[type] || type;
  };

  return (
    <div className="px-8 py-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0F3D3E] mb-2">
          Driver Profile
        </h1>
        <p className="text-gray-600">Manage your driver information</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
        {/* Profile Picture */}
        <div className="flex items-center gap-6">
          <div className="relative">
            {(imageUrl || user?.imageUrl) ? (
              <img
                key={imageUrl || user?.imageUrl}
                src={imageUrl || user?.imageUrl || ""}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-[#00796B]"
                onError={(e) => {
                  console.error("Image failed to load:", imageUrl || user?.imageUrl);
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Driver")}&background=00796B&color=fff&size=128`;
                }}
                onLoad={() => {
                  console.log("Image loaded successfully:", imageUrl || user?.imageUrl);
                }}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#00796B] flex items-center justify-center text-white text-2xl font-bold border-4 border-[#00796B]">
                {(name || user?.fullName || "D")[0].toUpperCase()}
              </div>
            )}
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-2">Profile Picture</p>
            <button
              onClick={handleChangePhotoClick}
              disabled={uploadingPhoto}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {uploadingPhoto ? "Uploading..." : "Change Photo"}
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-[#0F3D3E]">
            Account Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Enter your email"
              />
              <p className="text-xs text-gray-500 mt-1">
                Note: Changing email may require verification
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., +44 7911 123456"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4 text-[#0F3D3E]">
            Vehicle Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Vehicle Make
              </label>
              <input
                type="text"
                value={vehicle.make}
                onChange={(e) =>
                  setVehicle({ ...vehicle, make: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., Toyota"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Vehicle Model
              </label>
              <input
                type="text"
                value={vehicle.model}
                onChange={(e) =>
                  setVehicle({ ...vehicle, model: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., Prius"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                License Plate
              </label>
              <input
                type="text"
                value={vehicle.plate}
                onChange={(e) =>
                  setVehicle({ ...vehicle, plate: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., AB12 CDE"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="wheelchair"
                checked={vehicle.wheelchairCapable}
                onChange={(e) =>
                  setVehicle({
                    ...vehicle,
                    wheelchairCapable: e.target.checked,
                  })
                }
                className="w-4 h-4"
              />
              <label htmlFor="wheelchair" className="text-sm">
                Vehicle is wheelchair accessible
              </label>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4 text-[#0F3D3E]">
            Contact Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., +44 7911 123456"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#0F3D3E]">
              Verification Documents
            </h2>
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="px-4 py-2 bg-[#00796B] text-white rounded-lg font-semibold hover:bg-[#00695C] transition-colors text-sm"
            >
              {showUploadForm ? "Cancel" : "+ Upload Document"}
            </button>
          </div>

          {/* Upload Form */}
          {showUploadForm && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Document Type *
                </label>
                <select
                  value={uploadForm.documentType}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, documentType: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select document type</option>
                  <option value="LICENSE">Driving License</option>
                  <option value="INSURANCE">Insurance Certificate</option>
                  <option value="DBS">DBS Check</option>
                  <option value="TRAINING">Training Certificate</option>
                  <option value="VEHICLE_REGISTRATION">
                    Vehicle Registration
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Document File *
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadForm({ ...uploadForm, file });
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload PDF or image file (max 10MB). Accepted formats: PDF, JPEG, PNG, WebP
                </p>
                {uploadForm.file && (
                  <p className="text-xs text-green-600 mt-1">
                    Selected: {uploadForm.file.name} ({(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Expiry Date (optional)
                </label>
                <input
                  type="date"
                  value={uploadForm.expiryDate}
                  onChange={(e) =>
                    setUploadForm({ ...uploadForm, expiryDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <button
                onClick={handleUploadDocument}
                disabled={uploading}
                className="w-full px-4 py-2 bg-[#00796B] text-white rounded-lg font-semibold hover:bg-[#00695C] transition-colors disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload Document"}
              </button>
            </div>
          )}

          {/* Documents List */}
          {loading ? (
            <div className="text-center py-4 text-gray-500">Loading...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No documents uploaded yet. Click "Upload Document" to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {getDocumentTypeLabel(doc.documentType)}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          doc.status
                        )}`}
                      >
                        {doc.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Uploaded:{" "}
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>
                    {doc.expiryDate && (
                      <p className="text-sm text-gray-600">
                        Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                      </p>
                    )}
                    {doc.notes && (
                      <p className="text-sm text-gray-600 mt-1">
                        Notes: {doc.notes}
                      </p>
                    )}
                    <a
                      href={doc.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#00796B] hover:underline mt-1 inline-block"
                    >
                      View Document →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4 text-[#0F3D3E]">
            Verification Status
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  verificationStatus === "APPROVED"
                    ? "bg-green-500"
                    : verificationStatus === "REJECTED"
                    ? "bg-red-500"
                    : "bg-yellow-500"
                }`}
              ></div>
              <span className="text-sm font-medium">
                {verificationStatus === "APPROVED"
                  ? "All documents verified"
                  : verificationStatus === "REJECTED"
                  ? "Some documents rejected - please review"
                  : "Documents pending verification"}
              </span>
            </div>
            
            {/* Per-document status */}
            {Object.keys(verificationDetails).length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Document Status:</p>
                {Object.entries(verificationDetails).map(([type, status]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{getDocumentTypeLabel(type)}:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <p className="text-xs text-gray-500">
              Your documents are being reviewed by our compliance team. You'll
              be notified once verification is complete.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <button 
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-6 py-3 bg-[#00796B] text-white rounded-lg font-semibold hover:bg-[#00796B]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DriverProfilePage() {
  return (
    <RoleGate requiredRole={["DRIVER"]}>
      <AppLayout userRole="DRIVER">
        <DriverProfileContent />
      </AppLayout>
    </RoleGate>
  );
}

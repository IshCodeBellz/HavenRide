"use client";
import { useState, useEffect } from "react";
import RoleGate from "@/components/RoleGate";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";

type VerificationFilter =
  | "ALL"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED";

function CompliancePageContent() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<VerificationFilter>("ALL");

  useEffect(() => {
    async function fetchData() {
      try {
        const userRes = await fetch("/api/users/me");
        if (userRes.ok) {
          const userData = await userRes.json();
          setIsAdmin(userData.isAdmin || false);
        }

        const complianceRes = await fetch("/api/admin/compliance");
        if (complianceRes.ok) {
          const data = await complianceRes.json();
          setDrivers(data.drivers || []);
        }
      } catch (error) {
        console.error("Failed to fetch compliance data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredDrivers = drivers.filter((driver) => {
    if (filter === "ALL") return true;
    // For now, use docsVerified as a proxy for verification status
    if (filter === "APPROVED") return driver.docsVerified;
    if (filter === "PENDING") return !driver.docsVerified;
    return true;
  });

  const handleApproveDriver = async (driverId: string) => {
    try {
      const res = await fetch(
        `/api/admin/compliance/drivers/${driverId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (res.ok) {
        alert("Driver approved successfully");
        // Refresh data
        const complianceRes = await fetch("/api/admin/compliance");
        if (complianceRes.ok) {
          const data = await complianceRes.json();
          setDrivers(data.drivers || []);
        }
      }
    } catch (error) {
      console.error("Failed to approve driver:", error);
      alert("Failed to approve driver");
    }
  };

  const stats = {
    totalDrivers: drivers.length,
    verified: drivers.filter((d) => d.docsVerified).length,
    pending: drivers.filter((d) => !d.docsVerified).length,
    expiringSoon: drivers.filter((d) => {
      if (!d.insuranceExpiry) return false;
      const expiryDate = new Date(d.insuranceExpiry);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return expiryDate <= thirtyDaysFromNow;
    }).length,
  };

  return (
    <AppLayout userRole="ADMIN" isAdmin={isAdmin}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/admin"
              className="text-sm text-neutral-500 hover:text-[#00796B] mb-2 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-[#263238]">
              Compliance & Verification
            </h1>
            <p className="text-neutral-600 mt-2">
              DBS checks, training records, and GDPR compliance
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-neutral-600">Total Drivers</p>
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-3xl font-bold text-[#263238]">
              {stats.totalDrivers}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-neutral-600">Verified</p>
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-3xl font-bold text-green-600">
              {stats.verified}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-neutral-600">Pending Review</p>
              <svg
                className="w-6 h-6 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-neutral-600">Expiring Soon</p>
              <svg
                className="w-6 h-6 text-red-600"
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
            <p className="text-3xl font-bold text-red-600">
              {stats.expiringSoon}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Filter by Verification Status
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as VerificationFilter)}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
          >
            <option value="ALL">All Drivers</option>
            <option value="APPROVED">Verified</option>
            <option value="PENDING">Pending Verification</option>
            <option value="REJECTED">Rejected</option>
            <option value="EXPIRED">Expired Documents</option>
          </select>
        </div>

        {/* Drivers Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B] mx-auto mb-4"></div>
                <p className="text-neutral-600">Loading compliance data...</p>
              </div>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-neutral-500">No drivers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      License Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Insurance Expiry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DBS Check
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wheelchair Training
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDrivers.map((driver) => (
                    <tr
                      key={driver.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {driver.user?.name || "N/A"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {driver.user?.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {driver.licenseNumber || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {driver.insuranceExpiry ? (
                          <span
                            className={`${
                              new Date(driver.insuranceExpiry) <
                              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                                ? "text-red-600 font-semibold"
                                : "text-gray-900"
                            }`}
                          >
                            {new Date(
                              driver.insuranceExpiry
                            ).toLocaleDateString()}
                          </span>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          Not Recorded
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {driver.wheelchairTraining ? (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            Completed
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                            Not Completed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {driver.docsVerified ? (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                            Verified
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {!driver.docsVerified && (
                            <button
                              onClick={() => handleApproveDriver(driver.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Approve
                            </button>
                          )}
                          <Link
                            href={`/admin/compliance/drivers/${driver.id}`}
                            className="text-[#00796B] hover:text-[#00695C]"
                          >
                            View Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* GDPR Compliance Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <svg
              className="w-6 h-6 text-blue-600 shrink-0 mt-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                GDPR Compliance
              </h3>
              <p className="text-sm text-blue-800">
                All driver verification data is stored securely and in
                compliance with GDPR regulations. Access to sensitive
                information is logged and audited. Drivers have the right to
                request data access or deletion at any time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function CompliancePage() {
  return (
    <RoleGate requiredRole={["ADMIN"]}>
      <CompliancePageContent />
    </RoleGate>
  );
}

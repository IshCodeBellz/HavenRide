"use client";
import { useState, useEffect } from "react";
import RoleGate from "@/components/RoleGate";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";

function DispatcherManagementContent() {
  const [dispatchers, setDispatchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedDispatcher, setSelectedDispatcher] = useState<any>(null);
  const [assignData, setAssignData] = useState({ region: "", shift: "" });

  useEffect(() => {
    async function fetchData() {
      try {
        const userRes = await fetch("/api/users/me");
        if (userRes.ok) {
          const userData = await userRes.json();
          setIsAdmin(userData.isAdmin || false);
        }

        const dispatcherRes = await fetch("/api/admin/dispatchers");
        if (dispatcherRes.ok) {
          const data = await dispatcherRes.json();
          setDispatchers(data.dispatchers || []);
        }
      } catch (error) {
        console.error("Failed to fetch dispatcher data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredDispatchers = dispatchers.filter((dispatcher) => {
    if (filter === "ALL") return true;
    if (filter === "ACTIVE") return dispatcher.status === "ACTIVE";
    if (filter === "INACTIVE") return dispatcher.status !== "ACTIVE";
    return true;
  });

  const stats = {
    total: dispatchers.length,
    active: dispatchers.filter((d) => d.status === "ACTIVE").length,
    totalRides: dispatchers.reduce((sum, d) => sum + (d.ridesDispatched || 0), 0),
    avgResponseTime: dispatchers.length > 0
      ? Math.round(
          dispatchers.reduce((sum, d) => sum + (d.avgResponseTime || 0), 0) /
            dispatchers.length
        )
      : 0,
  };

  const handleAssignDispatcher = (dispatcher: any) => {
    setSelectedDispatcher(dispatcher);
    setAssignData({
      region: dispatcher.region || "",
      shift: dispatcher.shift || "",
    });
    setShowAssignModal(true);
  };

  const handleSaveAssignment = async () => {
    if (!selectedDispatcher) return;

    try {
      const res = await fetch(`/api/admin/dispatchers/${selectedDispatcher.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignData),
      });

      if (res.ok) {
        alert("Dispatcher assignment updated successfully");
        setShowAssignModal(false);
        setSelectedDispatcher(null);
        
        // Refresh dispatchers
        const dispatcherRes = await fetch("/api/admin/dispatchers");
        if (dispatcherRes.ok) {
          const data = await dispatcherRes.json();
          setDispatchers(data.dispatchers || []);
        }
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update assignment");
      }
    } catch (error) {
      console.error("Failed to update assignment:", error);
      alert("Failed to update assignment");
    }
  };

  return (
    <AppLayout userRole="ADMIN" isAdmin={isAdmin}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="text-sm text-neutral-500 hover:text-[#00796B] mb-2 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-[#263238]">
            Dispatcher Management
          </h1>
          <p className="text-neutral-600 mt-2">
            Monitor and manage dispatcher performance and assignments
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-neutral-600 mb-2">Total Dispatchers</p>
            <p className="text-3xl font-bold text-[#263238]">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-neutral-600 mb-2">Active</p>
            <p className="text-3xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-neutral-600 mb-2">Total Rides Dispatched</p>
            <p className="text-3xl font-bold text-[#00796B]">{stats.totalRides}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-neutral-600 mb-2">Avg Response Time</p>
            <p className="text-3xl font-bold text-blue-600">{stats.avgResponseTime}s</p>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Filter by Status
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
          >
            <option value="ALL">All Dispatchers</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* Dispatchers Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B] mx-auto mb-4"></div>
                <p className="text-neutral-600">Loading dispatchers...</p>
              </div>
            </div>
          ) : filteredDispatchers.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
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
              <p className="text-neutral-500">No dispatchers found</p>
              <p className="text-sm text-neutral-400 mt-1">
                Assign dispatcher roles to users to see them here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dispatcher
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Region
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shift
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rides Dispatched
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Response Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Active
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDispatchers.map((dispatcher) => (
                    <tr
                      key={dispatcher.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-[#00796B] flex items-center justify-center text-white font-semibold">
                              {dispatcher.user?.name?.charAt(0).toUpperCase() || "D"}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {dispatcher.user?.name || "Unknown"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {dispatcher.user?.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          {dispatcher.region || "Unassigned"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {dispatcher.shift || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {dispatcher.ridesDispatched || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {dispatcher.avgResponseTime || 0}s
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            dispatcher.status === "ACTIVE"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {dispatcher.status || "INACTIVE"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dispatcher.lastActiveAt
                          ? new Date(dispatcher.lastActiveAt).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/dispatchers/${dispatcher.id}`}
                          className="text-[#00796B] hover:text-[#00695C] mr-3"
                        >
                          View
                        </Link>
                        <button
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => handleAssignDispatcher(dispatcher)}
                        >
                          Assign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Performance Insights */}
        {!loading && dispatchers.length > 0 && (
          <div className="bg-gradient-to-br from-[#00796B] to-[#26A69A] rounded-xl shadow-lg p-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Performance Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm opacity-90 mb-1">Top Performer</p>
                <p className="text-xl font-semibold">
                  {dispatchers.reduce((max, d) =>
                    (d.ridesDispatched || 0) > (max.ridesDispatched || 0) ? d : max
                  ).user?.name || "N/A"}
                </p>
                <p className="text-xs opacity-75">
                  {dispatchers.reduce((max, d) =>
                    (d.ridesDispatched || 0) > (max.ridesDispatched || 0) ? d : max
                  ).ridesDispatched || 0}{" "}
                  rides dispatched
                </p>
              </div>
              <div>
                <p className="text-sm opacity-90 mb-1">Fastest Response</p>
                <p className="text-xl font-semibold">
                  {dispatchers
                    .filter((d) => d.avgResponseTime && d.avgResponseTime > 0)
                    .reduce((min, d) =>
                      (d.avgResponseTime || Infinity) < (min.avgResponseTime || Infinity)
                        ? d
                        : min
                    , { avgResponseTime: Infinity, user: { name: "N/A" } }).user?.name || "N/A"}
                </p>
                <p className="text-xs opacity-75">
                  {dispatchers
                    .filter((d) => d.avgResponseTime && d.avgResponseTime > 0)
                    .reduce((min, d) =>
                      (d.avgResponseTime || Infinity) < (min.avgResponseTime || Infinity)
                        ? d
                        : min
                    , { avgResponseTime: Infinity }).avgResponseTime !== Infinity
                    ? `${dispatchers
                        .filter((d) => d.avgResponseTime && d.avgResponseTime > 0)
                        .reduce((min, d) =>
                          (d.avgResponseTime || Infinity) < (min.avgResponseTime || Infinity)
                            ? d
                            : min
                        , { avgResponseTime: Infinity }).avgResponseTime}s avg response`
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm opacity-90 mb-1">Total Coverage</p>
                <p className="text-xl font-semibold">{stats.active} Active</p>
                <p className="text-xs opacity-75">
                  {((stats.active / stats.total) * 100).toFixed(0)}% online rate
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && selectedDispatcher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#263238]">
                Assign Dispatcher
              </h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedDispatcher(null);
                }}
                className="text-gray-500 hover:text-gray-700"
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

            <div className="mb-4">
              <p className="text-sm text-neutral-600">
                Assigning: <span className="font-semibold">{selectedDispatcher.user?.name || "Unknown"}</span>
              </p>
              <p className="text-xs text-neutral-500">{selectedDispatcher.user?.email}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Region
                </label>
                <select
                  value={assignData.region}
                  onChange={(e) =>
                    setAssignData({ ...assignData, region: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
                >
                  <option value="">Select Region</option>
                  <option value="North London">North London</option>
                  <option value="South London">South London</option>
                  <option value="East London">East London</option>
                  <option value="West London">West London</option>
                  <option value="Central London">Central London</option>
                  <option value="Greater London">Greater London</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Shift
                </label>
                <select
                  value={assignData.shift}
                  onChange={(e) =>
                    setAssignData({ ...assignData, shift: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
                >
                  <option value="">Select Shift</option>
                  <option value="Morning (6AM-2PM)">Morning (6AM-2PM)</option>
                  <option value="Afternoon (2PM-10PM)">Afternoon (2PM-10PM)</option>
                  <option value="Night (10PM-6AM)">Night (10PM-6AM)</option>
                  <option value="Day (8AM-4PM)">Day (8AM-4PM)</option>
                  <option value="Evening (4PM-12AM)">Evening (4PM-12AM)</option>
                  <option value="24/7 On-Call">24/7 On-Call</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedDispatcher(null);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAssignment}
                  className="flex-1 px-6 py-3 bg-[#00796B] text-white rounded-lg hover:bg-[#00695C] transition-colors font-semibold"
                >
                  Save Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function DispatcherManagementPage() {
  return (
    <RoleGate requiredRole={["ADMIN"]}>
      <DispatcherManagementContent />
    </RoleGate>
  );
}

"use client";
import { useState, useEffect } from "react";
import RoleGate from "@/components/RoleGate";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";

function IncidentsPageContent() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: "",
    priority: "",
    assignedTo: "",
    resolution: "",
  });

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter, priorityFilter, typeFilter]);

  async function fetchIncidents() {
    try {
      const userRes = await fetch("/api/users/me");
      if (userRes.ok) {
        const userData = await userRes.json();
        setIsAdmin(userData.isAdmin || false);
      }

      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (priorityFilter !== "ALL") params.append("priority", priorityFilter);
      if (typeFilter !== "ALL") params.append("type", typeFilter);

      const incidentsRes = await fetch(
        `/api/admin/incidents?${params.toString()}`
      );
      if (incidentsRes.ok) {
        const data = await incidentsRes.json();
        setIncidents(data.incidents || []);
      }
    } catch (error) {
      console.error("Failed to fetch incidents:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleViewIncident = async (incident: any) => {
    try {
      const res = await fetch(`/api/admin/incidents/${incident.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedIncident(data.incident);
        setUpdateData({
          status: data.incident.status,
          priority: data.incident.priority,
          assignedTo: data.incident.assignedTo?.id || "",
          resolution: data.incident.resolution || "",
        });
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error("Failed to fetch incident details:", error);
    }
  };

  const handleUpdateIncident = async () => {
    if (!selectedIncident) return;

    try {
      const res = await fetch(`/api/admin/incidents/${selectedIncident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        alert("Incident updated successfully");
        setShowDetailModal(false);
        fetchIncidents();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update incident");
      }
    } catch (error) {
      console.error("Failed to update incident:", error);
      alert("Failed to update incident");
    }
  };

  const stats = {
    total: incidents.length,
    open: incidents.filter((i) => i.status === "OPEN").length,
    inProgress: incidents.filter((i) => i.status === "IN_PROGRESS").length,
    resolved: incidents.filter((i) => i.status === "RESOLVED").length,
    escalated: incidents.filter((i) => i.status === "ESCALATED").length,
    critical: incidents.filter((i) => i.priority === "CRITICAL").length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-red-100 text-red-700";
      case "IN_PROGRESS":
        return "bg-amber-100 text-amber-700";
      case "RESOLVED":
        return "bg-green-100 text-green-700";
      case "ESCALATED":
        return "bg-purple-100 text-purple-700";
      case "CLOSED":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-100 text-red-700";
      case "HIGH":
        return "bg-orange-100 text-orange-700";
      case "MEDIUM":
        return "bg-amber-100 text-amber-700";
      case "LOW":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "SOS":
        return "🚨";
      case "ACCIDENT":
        return "💥";
      case "MECHANICAL":
        return "🔧";
      case "BEHAVIOR":
        return "⚠️";
      case "DELAY":
        return "⏱️";
      default:
        return "📋";
    }
  };

  return (
    <AppLayout userRole="ADMIN" isAdmin={isAdmin}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/admin"
              className="text-sm text-neutral-500 hover:text-[#5C7E9B] mb-2 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-[#263238]">Incident Management</h1>
            <p className="text-neutral-600 mt-2">
              Handle escalated incidents and emergencies
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-neutral-600 mb-2">Total Incidents</p>
            <p className="text-3xl font-bold text-[#263238]">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-neutral-600 mb-2">Open</p>
            <p className="text-3xl font-bold text-red-600">{stats.open}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-neutral-600 mb-2">In Progress</p>
            <p className="text-3xl font-bold text-amber-600">
              {stats.inProgress}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-neutral-600 mb-2">Resolved</p>
            <p className="text-3xl font-bold text-green-600">
              {stats.resolved}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <p className="text-sm text-neutral-600 mb-2">Critical</p>
            <p className="text-3xl font-bold text-red-700">{stats.critical}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C7E9B] focus:border-transparent"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="ESCALATED">Escalated</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Filter by Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C7E9B] focus:border-transparent"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Filter by Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C7E9B] focus:border-transparent"
              >
                <option value="ALL">All Types</option>
                <option value="SOS">SOS</option>
                <option value="ACCIDENT">Accident</option>
                <option value="MECHANICAL">Mechanical</option>
                <option value="BEHAVIOR">Behavior</option>
                <option value="DELAY">Delay</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Incidents Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5C7E9B] mx-auto mb-4"></div>
                <p className="text-neutral-600">Loading incidents...</p>
              </div>
            </div>
          ) : incidents.length === 0 ? (
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-neutral-500">No incidents found</p>
              <p className="text-sm text-neutral-400 mt-1">
                Incidents will appear here when reported
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reported By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {incidents.map((incident) => (
                    <tr
                      key={incident.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">
                            {getTypeIcon(incident.type)}
                          </span>
                          <span className="text-sm text-gray-900">
                            {incident.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {incident.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {incident.reportedBy?.name || "Unknown"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {incident.reportedBy?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(
                            incident.priority
                          )}`}
                        >
                          {incident.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            incident.status
                          )}`}
                        >
                          {incident.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {incident.assignedTo?.name || "Unassigned"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(incident.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewIncident(incident)}
                          className="text-[#5C7E9B] hover:text-[#4A6B85]"
                        >
                          View & Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Incident Detail Modal */}
      {showDetailModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#263238]">
                Incident Details
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
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

            <div className="space-y-6">
              {/* Incident Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Type
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {getTypeIcon(selectedIncident.type)}
                    </span>
                    <span>{selectedIncident.type}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Title
                  </label>
                  <p className="text-gray-900">{selectedIncident.title}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Reported By
                  </label>
                  <p className="text-gray-900">
                    {selectedIncident.reportedBy?.name || "Unknown"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedIncident.reportedBy?.email}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Location
                  </label>
                  <p className="text-gray-900">
                    {selectedIncident.location || "Not specified"}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Description
                </label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {selectedIncident.description}
                </p>
              </div>

              {selectedIncident.booking && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Related Booking
                  </h3>
                  <p className="text-sm text-blue-800">
                    Rider: {selectedIncident.booking.rider?.user?.name || "N/A"}
                  </p>
                  <p className="text-sm text-blue-800">
                    Driver:{" "}
                    {selectedIncident.booking.driver?.user?.name || "Not assigned"}
                  </p>
                  <p className="text-sm text-blue-800">
                    Route: {selectedIncident.booking.pickupAddress} →{" "}
                    {selectedIncident.booking.dropoffAddress}
                  </p>
                </div>
              )}

              {/* Update Form */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-[#263238] mb-4">
                  Update Incident
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Status
                    </label>
                    <select
                      value={updateData.status}
                      onChange={(e) =>
                        setUpdateData({ ...updateData, status: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C7E9B] focus:border-transparent"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="ESCALATED">Escalated</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={updateData.priority}
                      onChange={(e) =>
                        setUpdateData({
                          ...updateData,
                          priority: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C7E9B] focus:border-transparent"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Resolution Notes
                  </label>
                  <textarea
                    value={updateData.resolution}
                    onChange={(e) =>
                      setUpdateData({
                        ...updateData,
                        resolution: e.target.value,
                      })
                    }
                    placeholder="Enter resolution details..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5C7E9B] focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateIncident}
                    className="flex-1 px-6 py-3 bg-[#5C7E9B] text-white rounded-lg hover:bg-[#4A6B85] transition-colors font-semibold"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function IncidentsPage() {
  return (
    <RoleGate requiredRole={["ADMIN"]}>
      <IncidentsPageContent />
    </RoleGate>
  );
}





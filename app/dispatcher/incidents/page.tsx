"use client";
import { useState, useEffect } from "react";
import RoleGate from "@/components/RoleGate";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";
import { getChannel } from "@/lib/realtime/ably";

function IncidentsPageContent() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    type: "",
  });

  // Get bookingId from URL params if present
  const [bookingIdFromUrl, setBookingIdFromUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const bookingId = params.get("bookingId");
      if (bookingId) {
        setBookingIdFromUrl(bookingId);
        setShowCreateModal(true);
      }
    }
  }, []);

  const [createForm, setCreateForm] = useState({
    bookingId: bookingIdFromUrl,
    type: "OTHER",
    priority: "MEDIUM",
    title: "",
    description: "",
    location: "",
  });

  useEffect(() => {
    fetchIncidents();

    // Subscribe to real-time incident updates
    const channel = getChannel("dispatch");
    const handler = () => {
      fetchIncidents();
    };
    (channel as any)?.subscribe?.(handler);

    return () => {
      (channel as any)?.unsubscribe?.(handler);
    };
  }, [filters]);

  // Update form when bookingId from URL changes
  useEffect(() => {
    if (bookingIdFromUrl) {
      setCreateForm((prev) => ({ ...prev, bookingId: bookingIdFromUrl }));
    }
  }, [bookingIdFromUrl]);

  async function fetchIncidents() {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.priority) params.append("priority", filters.priority);
      if (filters.type) params.append("type", filters.type);

      const res = await fetch(`/api/dispatcher/incidents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setIncidents(Array.isArray(data.incidents) ? data.incidents : []);
      }
    } catch (e) {
      console.error("Failed to fetch incidents:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateIncident() {
    if (!createForm.title || !createForm.description) {
      alert("Please fill in title and description");
      return;
    }

    try {
      const res = await fetch("/api/dispatcher/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          bookingId: createForm.bookingId || null,
        }),
      });

      if (res.ok) {
        alert("Incident created successfully!");
        setShowCreateModal(false);
        setCreateForm({
          bookingId: "",
          type: "OTHER",
          priority: "MEDIUM",
          title: "",
          description: "",
          location: "",
        });
        fetchIncidents();
      } else {
        const data = await res.json();
        alert(`Failed to create incident: ${data.error}`);
      }
    } catch (error) {
      console.error("Error creating incident:", error);
      alert("Failed to create incident");
    }
  }

  async function handleUpdateStatus(incidentId: string, status: string) {
    try {
      const res = await fetch(`/api/dispatcher/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        fetchIncidents();
        if (selectedIncident?.id === incidentId) {
          const data = await res.json();
          setSelectedIncident(data.incident);
        }
      } else {
        const data = await res.json();
        alert(`Failed to update status: ${data.error}`);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  }

  async function handleEscalate(incidentId: string) {
    if (!confirm("Escalate this incident to admin?")) {
      return;
    }

    try {
      const res = await fetch(`/api/dispatcher/incidents/${incidentId}/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        alert("Incident escalated to admin");
        fetchIncidents();
        if (selectedIncident?.id === incidentId) {
          const data = await res.json();
          setSelectedIncident(data.incident);
        }
      } else {
        const data = await res.json();
        alert(`Failed to escalate: ${data.error}`);
      }
    } catch (error) {
      console.error("Error escalating incident:", error);
      alert("Failed to escalate incident");
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-100 text-red-700";
      case "HIGH":
        return "bg-orange-100 text-orange-700";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-700";
      case "LOW":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-red-100 text-red-700";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700";
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

  const openIncident = incidents.filter((i) => i.status === "OPEN").length;
  const critical = incidents.filter((i) => i.priority === "CRITICAL").length;
  const escalated = incidents.filter((i) => i.status === "ESCALATED").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 md:py-8">
          <div className="flex flex-col items-center gap-4 sm:gap-5 md:gap-6 relative">
            <Link
              href="/dispatcher"
              className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#263238] text-center">
              Incident Management
            </h1>
            <div className="flex gap-3 sm:gap-4 md:gap-5 flex-shrink-0">
              <Link
                href="/dispatcher"
                className="px-4 sm:px-5 md:px-6 lg:px-7 py-2.5 sm:py-3 md:py-3.5 text-base sm:text-lg border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                Dashboard
              </Link>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 sm:px-5 md:px-6 lg:px-7 py-2.5 sm:py-3 md:py-3.5 text-base sm:text-lg bg-[#00796B] text-white rounded-lg hover:bg-[#00695C] transition-colors whitespace-nowrap"
              >
                + Report Incident
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Total Incidents</div>
            <div className="text-3xl font-bold text-[#263238]">
              {incidents.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Open</div>
            <div className="text-3xl font-bold text-red-700">{openIncident}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Critical</div>
            <div className="text-3xl font-bold text-red-700">{critical}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Escalated</div>
            <div className="text-3xl font-bold text-purple-700">
              {escalated}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#263238] mb-4">
            Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters({ ...filters, status: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
              >
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="ESCALATED">Escalated</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) =>
                  setFilters({ ...filters, priority: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
              >
                <option value="">All</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
              >
                <option value="">All</option>
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

        {/* Incidents List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-[#263238] mb-4">
            Incidents ({incidents.length})
          </h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B] mx-auto mb-4"></div>
              <p className="text-neutral-600">Loading incidents...</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No incidents found
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedIncident(incident);
                    setShowDetailModal(true);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-[#263238]">
                          {incident.title}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                            incident.priority
                          )}`}
                        >
                          {incident.priority}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            incident.status
                          )}`}
                        >
                          {incident.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {incident.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Type: {incident.type}</span>
                        {incident.booking && (
                          <span>Booking: {incident.booking.id.slice(0, 8)}...</span>
                        )}
                        <span>
                          Reported:{" "}
                          {new Date(incident.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {incident.status === "OPEN" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(incident.id, "IN_PROGRESS");
                          }}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Start
                        </button>
                      )}
                      {incident.status !== "ESCALATED" &&
                        incident.status !== "CLOSED" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEscalate(incident.id);
                            }}
                            className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                          >
                            Escalate
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Incident Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[#263238]">
                Report Incident
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
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
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Booking ID (Optional)
                </label>
                <input
                  type="text"
                  value={createForm.bookingId}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, bookingId: e.target.value })
                  }
                  placeholder="Leave empty if not related to a booking"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={createForm.type}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, type: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
                  >
                    <option value="SOS">SOS</option>
                    <option value="ACCIDENT">Accident</option>
                    <option value="MECHANICAL">Mechanical</option>
                    <option value="BEHAVIOR">Behavior</option>
                    <option value="DELAY">Delay</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, priority: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, title: e.target.value })
                  }
                  placeholder="Brief incident title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  rows={4}
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, description: e.target.value })
                  }
                  placeholder="Detailed description of the incident"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={createForm.location}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, location: e.target.value })
                  }
                  placeholder="Incident location"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateIncident}
                className="px-6 py-2 bg-[#00796B] text-white rounded-lg hover:bg-[#00695C] transition-colors"
              >
                Report Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incident Detail Modal */}
      {showDetailModal && selectedIncident && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[#263238]">
                Incident Details
              </h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedIncident(null);
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
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={selectedIncident.status}
                    onChange={(e) =>
                      handleUpdateStatus(selectedIncident.id, e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="ESCALATED">Escalated</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <span
                    className={`inline-block px-3 py-2 rounded-lg text-sm font-medium ${getPriorityColor(
                      selectedIncident.priority
                    )}`}
                  >
                    {selectedIncident.priority}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <p className="text-[#263238] font-semibold">
                  {selectedIncident.title}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <p className="text-gray-700">{selectedIncident.description}</p>
              </div>
              {selectedIncident.location && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <p className="text-gray-700">{selectedIncident.location}</p>
                </div>
              )}
              {selectedIncident.booking && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Related Booking
                  </label>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reported By
                  </label>
                  <p className="text-gray-700">
                    {selectedIncident.reporter?.name || "Unknown"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned To
                  </label>
                  <p className="text-gray-700">
                    {selectedIncident.assignee?.name || "Unassigned"}
                  </p>
                </div>
              </div>
              {selectedIncident.resolution && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resolution
                  </label>
                  <p className="text-gray-700">{selectedIncident.resolution}</p>
                </div>
              )}
              <div className="text-xs text-gray-500">
                Created: {new Date(selectedIncident.createdAt).toLocaleString()}
                {selectedIncident.resolvedAt &&
                  ` • Resolved: ${new Date(selectedIncident.resolvedAt).toLocaleString()}`}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              {selectedIncident.status !== "ESCALATED" &&
                selectedIncident.status !== "CLOSED" && (
                  <button
                    onClick={() => handleEscalate(selectedIncident.id)}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Escalate to Admin
                  </button>
                )}
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedIncident(null);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DispatcherIncidentsPage() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.isAdmin || false);
        }
      } catch (e) {
        console.error(e);
      }
    }
    checkAdmin();
  }, []);

  return (
    <RoleGate requiredRole={["DISPATCHER"]}>
      <AppLayout userRole="DISPATCHER" isAdmin={isAdmin}>
        <IncidentsPageContent />
      </AppLayout>
    </RoleGate>
  );
}


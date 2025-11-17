"use client";
import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import RoleGate from "@/components/RoleGate";

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
}

function DriverSupportContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    description: "",
    category: "OTHER",
    priority: "MEDIUM",
  });
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [showMyTickets, setShowMyTickets] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    try {
      const res = await fetch("/api/support/tickets");
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    }
  }

  async function handleCreateTicket() {
    if (!ticketForm.subject || !ticketForm.description) {
      alert("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketForm),
      });

      if (res.ok) {
        alert("Support ticket created successfully! Our team will review it soon.");
        setTicketForm({
          subject: "",
          description: "",
          category: "OTHER",
          priority: "MEDIUM",
        });
        setShowTicketForm(false);
        fetchTickets();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create support ticket");
      }
    } catch (error) {
      console.error("Failed to create ticket:", error);
      alert("An error occurred while creating the ticket");
    } finally {
      setSubmitting(false);
    }
  }

  const handleQuickAction = (action: string) => {
    setShowTicketForm(true);
    switch (action) {
      case "safety":
        setTicketForm({
          subject: "Safety Issue Report",
          description: "",
          category: "SAFETY",
          priority: "HIGH",
        });
        break;
      case "vehicle":
        setTicketForm({
          subject: "Vehicle Information Update",
          description: "",
          category: "VEHICLE",
          priority: "MEDIUM",
        });
        break;
      case "payment":
        setTicketForm({
          subject: "Payment Support Request",
          description: "",
          category: "PAYMENT",
          priority: "MEDIUM",
        });
        break;
      default:
        setTicketForm({
          subject: "",
          description: "",
          category: "OTHER",
          priority: "MEDIUM",
        });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RESOLVED":
        return "bg-green-100 text-green-700";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700";
      case "CLOSED":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-700";
      case "HIGH":
        return "bg-orange-100 text-orange-700";
      case "LOW":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  const helpArticles = [
    {
      id: 1,
      icon: "🚗",
      title: "Getting Started as a Driver",
      description: "Learn how to set up your profile and start accepting rides",
    },
    {
      id: 2,
      icon: "💰",
      title: "Understanding Earnings & Payouts",
      description: "How driver payouts work and when you get paid",
    },
    {
      id: 3,
      icon: "♿",
      title: "Accessibility Services",
      description: "Guidelines for providing wheelchair-accessible rides",
    },
    {
      id: 4,
      icon: "📋",
      title: "Ride Documentation",
      description: "How to properly document rides after completion",
    },
    {
      id: 5,
      icon: "⭐",
      title: "Vehicle Requirements",
      description: "Vehicle standards and maintenance requirements",
    },
    {
      id: 6,
      icon: "🔒",
      title: "Safety & Security",
      description: "Staying safe while driving and emergency procedures",
    },
  ];

  const filteredArticles = helpArticles.filter(
    (article) =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="px-8 py-6 max-w-7xl mx-auto safe-area-content">
      {/* Header */}
      <div className="mb-8 safe-area-top">
        <h1 className="text-3xl font-bold text-[#5C7E9B] mb-2">
          Driver Support
        </h1>
        <p className="text-gray-600">How can we help you today?</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C7E9B]"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </div>
        </div>
      </div>

      {/* Help Articles */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-xl font-semibold text-[#5C7E9B] mb-4">
          Help Articles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredArticles.length > 0 ? (
            filteredArticles.map((article) => (
              <div
                key={article.id}
                className="border rounded-xl p-4 hover:border-[#5C7E9B] hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{article.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {article.description}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-8 text-gray-500">
              No articles found matching your search.
            </div>
          )}
        </div>
      </div>

      {/* My Tickets Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#5C7E9B]">My Tickets</h2>
          <button
            onClick={() => setShowMyTickets(!showMyTickets)}
            className="px-4 py-2 text-[#5C7E9B] hover:bg-[#5C7E9B]/10 rounded-lg font-semibold transition-colors text-sm"
          >
            {showMyTickets ? "Hide" : "View"} My Tickets ({tickets.length})
          </button>
        </div>

        {showMyTickets && (
          <div className="space-y-3">
            {tickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No support tickets yet. Create one below!
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border rounded-lg p-4 hover:border-[#5C7E9B] transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {ticket.subject}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {ticket.description}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          ticket.status
                        )}`}
                      >
                        {ticket.status}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                          ticket.priority
                        )}`}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                    <span>Category: {ticket.category}</span>
                    <span>
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Create Ticket Form */}
      {showTicketForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-[#5C7E9B] mb-4">
            Create Support Ticket
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Subject *
              </label>
              <input
                type="text"
                value={ticketForm.subject}
                onChange={(e) =>
                  setTicketForm({ ...ticketForm, subject: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Brief description of your issue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description *
              </label>
              <textarea
                value={ticketForm.description}
                onChange={(e) =>
                  setTicketForm({ ...ticketForm, description: e.target.value })
                }
                rows={5}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Please provide details about your issue..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Category
                </label>
                <select
                  value={ticketForm.category}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="PAYMENT">Payment</option>
                  <option value="RIDE_ISSUE">Ride Issue</option>
                  <option value="TECHNICAL">Technical</option>
                  <option value="ACCOUNT">Account</option>
                  <option value="VEHICLE">Vehicle</option>
                  <option value="SAFETY">Safety</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <select
                  value={ticketForm.priority}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, priority: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreateTicket}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-[#5C7E9B] text-white rounded-lg font-semibold hover:bg-[#4A6B85] transition-colors disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Ticket"}
              </button>
              <button
                onClick={() => {
                  setShowTicketForm(false);
                  setTicketForm({
                    subject: "",
                    description: "",
                    category: "OTHER",
                    priority: "MEDIUM",
                  });
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Options */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-xl font-semibold text-[#5C7E9B] mb-4">
          Contact Support
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="border-2 border-[#5C7E9B] rounded-xl p-4 hover:bg-[#5C7E9B] hover:text-white transition-colors">
            <div className="text-3xl mb-2">💬</div>
            <div className="font-semibold">Chat with Us</div>
            <div className="text-sm text-gray-600 mt-1">
              Average response: 2 mins
            </div>
          </button>
          <button className="border-2 border-[#5C7E9B] rounded-xl p-4 hover:bg-[#5C7E9B] hover:text-white transition-colors">
            <div className="text-3xl mb-2">📞</div>
            <div className="font-semibold">Call Support</div>
            <div className="text-sm text-gray-600 mt-1">Available 24/7</div>
          </button>
          <button className="border-2 border-[#5C7E9B] rounded-xl p-4 hover:bg-[#5C7E9B] hover:text-white transition-colors">
            <div className="text-3xl mb-2">📧</div>
            <div className="font-semibold">Email Us</div>
            <div className="text-sm text-gray-600 mt-1">
              Response within 24hrs
            </div>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#5C7E9B] mb-4">
          Quick Actions
        </h2>
        <div className="space-y-3">
          <button
            onClick={() => handleQuickAction("safety")}
            className="w-full text-left p-4 border rounded-xl hover:border-[#5C7E9B] hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">
                  Report a Safety Issue
                </div>
                <div className="text-sm text-gray-600">
                  Report safety concerns or incidents
                </div>
              </div>
              <div className="text-xl">→</div>
            </div>
          </button>
          <button
            onClick={() => handleQuickAction("vehicle")}
            className="w-full text-left p-4 border rounded-xl hover:border-[#5C7E9B] hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">
                  Update Vehicle Information
                </div>
                <div className="text-sm text-gray-600">
                  Change your vehicle details or documents
                </div>
              </div>
              <div className="text-xl">→</div>
            </div>
          </button>
          <button
            onClick={() => handleQuickAction("payment")}
            className="w-full text-left p-4 border rounded-xl hover:border-[#5C7E9B] hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">
                  Request Payment Support
                </div>
                <div className="text-sm text-gray-600">
                  Get help with earnings or payouts
                </div>
              </div>
              <div className="text-xl">→</div>
            </div>
          </button>
          <button
            onClick={() => {
              setShowTicketForm(true);
              setTicketForm({
                subject: "",
                description: "",
                category: "OTHER",
                priority: "MEDIUM",
              });
            }}
            className="w-full text-left p-4 border rounded-xl hover:border-[#5C7E9B] hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">
                  Create General Ticket
                </div>
                <div className="text-sm text-gray-600">
                  Submit any other support request
                </div>
              </div>
              <div className="text-xl">→</div>
            </div>
          </button>
        </div>
      </div>

      {/* Emergency Notice */}
      <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🚨</div>
          <div>
            <div className="font-semibold text-red-900 mb-1">
              Emergency Assistance
            </div>
            <div className="text-sm text-red-700">
              If you're in immediate danger, please call emergency services
              (999) or use the SOS button in the app.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DriverSupportPage() {
  return (
    <RoleGate requiredRole={["DRIVER"]}>
      <AppLayout userRole="DRIVER">
        <DriverSupportContent />
      </AppLayout>
    </RoleGate>
  );
}

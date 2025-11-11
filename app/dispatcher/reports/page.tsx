"use client";
import { useState, useEffect } from "react";
import RoleGate from "@/components/RoleGate";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";

function ReportsPageContent() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [exporting, setExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchBookings();
    fetchDrivers();
    
    // Check if mobile on mount and resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  async function fetchBookings() {
    try {
      const res = await fetch("/api/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to fetch bookings:", e);
    }
  }

  async function fetchDrivers() {
    try {
      const res = await fetch("/api/dispatcher/drivers");
      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers || []);
      }
    } catch (e) {
      console.error("Failed to fetch drivers:", e);
    }
  }

  // Calculate statistics
  const completed = bookings.filter((b) => b.status === "COMPLETED");
  const canceled = bookings.filter((b) => b.status === "CANCELED");
  const totalRevenue = completed.reduce(
    (sum, b) => sum + (b.finalFareAmount || 0),
    0
  );

  // Filter bookings by date range
  const filteredBookings = bookings.filter((b) => {
    const bookingDate = new Date(b.pickupTime).toISOString().split("T")[0];
    return bookingDate >= dateRange.from && bookingDate <= dateRange.to;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBookings = filteredBookings.slice(startIndex, endIndex);

  // Reset to page 1 when date range changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange.from, dateRange.to]);

  // CSV export functions
  const exportBookingsCSV = () => {
    setExporting(true);
    try {
      const headers = [
        "ID",
        "Pickup Address",
        "Dropoff Address",
        "Status",
        "Fare",
        "Wheelchair",
        "Date",
      ];
      const rows = filteredBookings.map((booking) => [
        booking.id,
        booking.pickupAddress.replace(/,/g, " "),
        booking.dropoffAddress.replace(/,/g, " "),
        booking.status,
        booking.finalFareAmount?.toFixed(2) || "N/A",
        booking.requiresWheelchair ? "Yes" : "No",
        new Date(booking.pickupTime).toLocaleString(),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `bookings_${dateRange.from}_to_${dateRange.to}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  const exportDriverPerformanceCSV = () => {
    setExporting(true);
    try {
      const headers = [
        "Driver Name",
        "Vehicle",
        "Plate",
        "Total Rides",
        "Completed Rides",
        "Rating",
        "Status",
      ];
      const rows = drivers.map((driver) => {
        const driverBookings = bookings.filter((b) => b.driverId === driver.id);
        const completedRides = driverBookings.filter(
          (b) => b.status === "COMPLETED"
        ).length;

        return [
          driver.user.name || "N/A",
          `${driver.vehicleMake || ""} ${driver.vehicleModel || ""}`.trim() ||
            "N/A",
          driver.vehiclePlate || "N/A",
          driverBookings.length,
          completedRides,
          driver.rating?.toFixed(1) || "N/A",
          driver.isOnline ? "Online" : "Offline",
        ];
      });

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `driver_performance_${dateRange.from}_to_${dateRange.to}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

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
              Reports & Analytics
            </h1>
            <div className="flex gap-3 sm:gap-4 md:gap-5 flex-shrink-0">
              <Link
                href="/dispatcher/map"
                className="px-4 sm:px-5 md:px-6 lg:px-7 py-2.5 sm:py-3 md:py-3.5 text-base sm:text-lg border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                Live Map
              </Link>
              <Link
                href="/dispatcher"
                className="px-4 sm:px-5 md:px-6 lg:px-7 py-2.5 sm:py-3 md:py-3.5 text-base sm:text-lg bg-[#00796B] text-white rounded-lg hover:bg-[#00695C] transition-colors whitespace-nowrap"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-sm font-semibold text-[#263238] whitespace-nowrap">
              Date Range
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 whitespace-nowrap">From</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange({ ...dateRange, from: e.target.value })
                }
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 whitespace-nowrap">To</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange({ ...dateRange, to: e.target.value })
                }
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
              />
            </div>
            <button
              className="px-4 py-1.5 text-sm bg-[#00796B] text-white rounded-lg hover:bg-[#00695C] transition-colors whitespace-nowrap"
              onClick={() => {
                fetchBookings();
                fetchDrivers();
              }}
            >
              Apply Filter
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <button
                className="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                onClick={exportBookingsCSV}
                disabled={exporting}
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span className="text-xs">Exporting...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="text-xs">Export Bookings</span>
                  </>
                )}
              </button>
              <button
                className="px-4 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                onClick={exportDriverPerformanceCSV}
                disabled={exporting}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-xs">Export Drivers</span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Total Bookings</div>
            <div className="text-3xl font-bold text-[#263238]">
              {bookings.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Completed</div>
            <div className="text-3xl font-bold text-green-700">
              {completed.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Canceled</div>
            <div className="text-3xl font-bold text-red-700">
              {canceled.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
            <div className="text-3xl font-bold text-[#00796B]">
              £{totalRevenue.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Driver Performance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-[#263238] mb-4">
            Driver Performance
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    Driver
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    Rides
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    Rating
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#263238]">
                        {driver.user.name || "Driver"}
                      </div>
                      <div className="text-sm text-gray-600">
                        {driver.vehiclePlate || "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {
                        bookings.filter(
                          (b) =>
                            b.driverId === driver.id && b.status === "COMPLETED"
                        ).length
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {driver.rating ? driver.rating.toFixed(1) : "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      {driver.isOnline ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          Online
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                          Offline
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {drivers.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No drivers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#263238]">
              Recent Bookings
            </h2>
            {filteredBookings.length > 0 && (
              <span className="text-sm text-gray-600">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredBookings.length)} of {filteredBookings.length}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    ID
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    Pickup
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    Fare
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {booking.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {booking.pickupAddress}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          booking.status === "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : booking.status === "CANCELED"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      £{booking.finalFareAmount?.toFixed(2) || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(booking.pickupTime).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {filteredBookings.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No bookings found in selected date range
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <div className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-1 sm:gap-2 justify-center w-full sm:w-auto overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                  >
                    Prev
                  </button>
                  <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                    {Array.from({ length: Math.min(isMobile ? 3 : 5, totalPages) }, (_, i) => {
                      let pageNum;
                      const maxVisible = isMobile ? 3 : 5;
                      if (totalPages <= maxVisible) {
                        pageNum = i + 1;
                      } else if (currentPage <= Math.ceil(maxVisible / 2)) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - Math.floor(maxVisible / 2)) {
                        pageNum = totalPages - maxVisible + 1 + i;
                      } else {
                        pageNum = currentPage - Math.floor(maxVisible / 2) + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors flex-shrink-0 min-w-[2rem] sm:min-w-[2.5rem] ${
                            currentPage === pageNum
                              ? "bg-[#00796B] text-white"
                              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DispatcherReportsPage() {
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
        <ReportsPageContent />
      </AppLayout>
    </RoleGate>
  );
}

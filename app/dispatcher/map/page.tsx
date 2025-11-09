"use client";
import { useState, useEffect } from "react";
import RoleGate from "@/components/RoleGate";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";

function MapPageContent() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    fetchDrivers();
    fetchBookings();

    // Refresh every 5 seconds for real-time updates
    const interval = setInterval(() => {
      fetchDrivers();
      fetchBookings();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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

  const activeBookings = bookings.filter(
    (b) => b.status !== "COMPLETED" && b.status !== "CANCELED"
  );
  const onlineDrivers = drivers.filter((d) => d.isOnline);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/dispatcher"
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-[#263238]">Live Map</h1>
          </div>
          <div className="flex gap-3">
            <Link
              href="/dispatcher/reports"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reports
            </Link>
            <Link
              href="/dispatcher"
              className="px-4 py-2 bg-[#00796B] text-white rounded-lg hover:bg-[#00695C] transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Online Drivers</div>
            <div className="text-3xl font-bold text-green-700">{onlineDrivers.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Active Rides</div>
            <div className="text-3xl font-bold text-blue-700">{activeBookings.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Total Drivers</div>
            <div className="text-3xl font-bold text-[#263238]">{drivers.length}</div>
          </div>
        </div>

        {/* Map Placeholder */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <div className="text-center">
            <div className="w-full h-[500px] bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <div className="text-center">
                <svg
                  className="w-24 h-24 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Live Map View
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Google Maps integration with real-time driver positions and active ride tracking will be displayed here.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Driver List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-[#263238] mb-4">
            Online Drivers ({onlineDrivers.length})
          </h2>
          <div className="space-y-3">
            {onlineDrivers.map((driver) => (
              <div
                key={driver.id}
                className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="font-medium text-[#263238]">
                    {driver.user.name || "Driver"}
                  </div>
                  <div className="text-sm text-gray-600">
                    {driver.vehicleMake} {driver.vehicleModel} • {driver.vehiclePlate || "N/A"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {driver.wheelchairCapable && (
                    <span className="text-sm text-amber-600">♿</span>
                  )}
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    Online
                  </span>
                </div>
              </div>
            ))}
            {onlineDrivers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No drivers currently online
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DispatcherMapPage() {
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
        <MapPageContent />
      </AppLayout>
    </RoleGate>
  );
}

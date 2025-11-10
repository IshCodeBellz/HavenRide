"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import AppLayout from "@/components/AppLayout";
import RoleGate from "@/components/RoleGate";

interface PayoutEntry {
  id: string;
  rideId: string;
  date: string;
  riderName: string;
  pickup: string;
  dropoff: string;
  grossFare: number;
  commission: number;
  driverEarnings: number;
  currency: string;
  status: string;
}

interface PayoutSummary {
  totalEarnings: number;
  totalCommission: number;
  totalGross: number;
  thisWeekEarnings: number;
  thisMonthEarnings: number;
  totalRides: number;
  commissionRate: number;
  pendingPayout: number;
}

function DriverEarningsContent() {
  const { user } = useUser();
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    completedRides: 0,
    averagePerRide: 0,
    thisWeek: 0,
  });
  const [payoutHistory, setPayoutHistory] = useState<PayoutEntry[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchEarnings();
    fetchPayoutHistory();
  }, [user?.id]);

  async function fetchEarnings() {
    try {
      const res = await fetch("/api/bookings");
      const data = await res.json();
      const myBookings = data.filter(
        (b: any) => b.driverId === user?.id && b.status === "COMPLETED"
      );

      const totalEarnings = myBookings.reduce((sum: number, b: any) => {
        const fare = b.finalFareAmount || 0;
        return sum + fare * 0.75; // 75% payout rate
      }, 0);

      setEarnings({
        totalEarnings,
        completedRides: myBookings.length,
        averagePerRide:
          myBookings.length > 0 ? totalEarnings / myBookings.length : 0,
        thisWeek: totalEarnings,
      });
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchPayoutHistory() {
    try {
      const res = await fetch("/api/drivers/payouts");
      if (res.ok) {
        const data = await res.json();
        setPayoutHistory(data.payoutHistory || []);
        setSummary(data.summary || null);
      }
    } catch (error) {
      console.error("Failed to fetch payout history:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0F3D3E] mb-2">My Earnings</h1>
        <p className="text-gray-600">View your earnings breakdown</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            Total Earnings
          </h3>
          <p className="text-3xl font-bold text-[#0F3D3E]">
            £{summary?.totalEarnings.toFixed(2) || earnings.totalEarnings.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            From {summary?.totalRides || earnings.completedRides} rides
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            This Week
          </h3>
          <p className="text-3xl font-bold text-[#0F3D3E]">
            £{summary?.thisWeekEarnings.toFixed(2) || earnings.thisWeek.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            This Month
          </h3>
          <p className="text-3xl font-bold text-[#0F3D3E]">
            £{summary?.thisMonthEarnings.toFixed(2) || "0.00"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600 mb-1">
            Avg Per Ride
          </h3>
          <p className="text-3xl font-bold text-[#0F3D3E]">
            £{summary?.totalEarnings && summary.totalRides > 0
              ? (summary.totalEarnings / summary.totalRides).toFixed(2)
              : earnings.averagePerRide.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Payout Information */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="text-xl font-semibold mb-4 text-[#0F3D3E]">
          Payout Information
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Payout Rate</div>
            <div className="text-lg font-semibold">
              {summary
                ? `${((1 - summary.commissionRate) * 100).toFixed(0)}%`
                : "75%"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Gross</div>
            <div className="text-lg font-semibold">
              £{summary?.totalGross.toFixed(2) || "0.00"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Commission</div>
            <div className="text-lg font-semibold">
              £{summary?.totalCommission.toFixed(2) || "0.00"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Pending Payout</div>
            <div className="text-lg font-semibold text-[#00796B]">
              £{summary?.pendingPayout.toFixed(2) || "0.00"}
            </div>
          </div>
        </div>
      </div>

      {/* Payout History */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#0F3D3E]">
            Payout History
          </h2>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 text-[#00796B] hover:bg-[#00796B]/10 rounded-lg font-semibold transition-colors text-sm"
          >
            {showHistory ? "Hide" : "Show"} History ({payoutHistory.length})
          </button>
        </div>

        {showHistory && (
          <div className="overflow-x-auto">
            {payoutHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No payout history yet. Completed rides will appear here.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Rider
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Route
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Gross Fare
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Commission
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Your Earnings
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payoutHistory.map((payout) => (
                    <tr
                      key={payout.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(payout.date).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {payout.riderName}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        <div className="max-w-xs truncate">
                          {payout.pickup.split(",")[0]} →{" "}
                          {payout.dropoff.split(",")[0]}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">
                        £{payout.grossFare.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">
                        -£{payout.commission.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-[#0F3D3E]">
                        £{payout.driverEarnings.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {payout.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={3} className="py-3 px-4 text-sm text-gray-900">
                      Total
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900">
                      £{summary?.totalGross.toFixed(2) || "0.00"}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900">
                      -£{summary?.totalCommission.toFixed(2) || "0.00"}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-[#0F3D3E]">
                      £{summary?.totalEarnings.toFixed(2) || "0.00"}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DriverEarningsPage() {
  return (
    <RoleGate requiredRole={["DRIVER"]}>
      <AppLayout userRole="DRIVER">
        <DriverEarningsContent />
      </AppLayout>
    </RoleGate>
  );
}

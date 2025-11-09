"use client";
import { useState, useEffect } from "react";
import RoleGate from "@/components/RoleGate";
import AppLayout from "@/components/AppLayout";
import Link from "next/link";

function FinancePageContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [timeframe, setTimeframe] = useState("month");

  useEffect(() => {
    async function fetchData() {
      try {
        const userRes = await fetch("/api/users/me");
        if (userRes.ok) {
          const userData = await userRes.json();
          setIsAdmin(userData.isAdmin || false);
        }

        const financeRes = await fetch(
          `/api/admin/finance?timeframe=${timeframe}`
        );
        if (financeRes.ok) {
          const financeData = await financeRes.json();
          setData(financeData);
        }
      } catch (error) {
        console.error("Failed to fetch finance data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [timeframe]);

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
              Finance & Billing
            </h1>
            <p className="text-neutral-600 mt-2">
              Payment analytics, commissions, and payouts
            </p>
          </div>
          <div>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00796B] focus:border-transparent"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B] mx-auto mb-4"></div>
              <p className="text-neutral-600">Loading financial data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Revenue Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-[#00796B] to-[#26A69A] rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm opacity-90">Total Revenue</p>
                  <svg
                    className="w-8 h-8 opacity-80"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-4xl font-bold">
                  £{data?.revenue?.total?.toFixed(2) || "0.00"}
                </p>
                <p className="text-sm opacity-90 mt-2">
                  {data?.revenue?.rideCount || 0} completed rides
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-neutral-600">
                    Platform Commission
                  </p>
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
                      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-[#263238]">
                  £{data?.commission?.total?.toFixed(2) || "0.00"}
                </p>
                <p className="text-sm text-neutral-500 mt-2">
                  {data?.commission?.rate || 15}% avg rate
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-neutral-600">Driver Earnings</p>
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
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-[#263238]">
                  £{data?.driverEarnings?.total?.toFixed(2) || "0.00"}
                </p>
                <p className="text-sm text-neutral-500 mt-2">
                  {data?.driverEarnings?.count || 0} active drivers
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-neutral-600">Pending Payouts</p>
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
                <p className="text-3xl font-bold text-[#263238]">
                  £{data?.pendingPayouts?.total?.toFixed(2) || "0.00"}
                </p>
                <p className="text-sm text-neutral-500 mt-2">
                  {data?.pendingPayouts?.count || 0} pending
                </p>
              </div>
            </div>

            {/* Payment Methods & Stripe Integration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-[#263238] mb-4">
                  Payment Methods
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#635BFF] rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-white"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.548 3.445 2.583 0 .98-.84 1.632-2.104 1.632-2.446 0-5.24-1.117-7.007-2.215l-.955 5.697c1.77.966 4.556 1.765 7.532 1.765 2.686 0 4.873-.681 6.431-1.997 1.632-1.376 2.467-3.359 2.467-5.868 0-3.92-2.392-5.666-6.066-7.054z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Stripe</p>
                        <p className="text-sm text-gray-500">
                          Connected & Active
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#263238]">
                        {data?.paymentMethods?.stripe || 0}
                      </p>
                      <p className="text-xs text-gray-500">transactions</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#00796B] rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          LA Invoicing
                        </p>
                        <p className="text-sm text-gray-500">Local Authority</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#263238]">
                        {data?.paymentMethods?.invoice || 0}
                      </p>
                      <p className="text-xs text-gray-500">invoices</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-[#263238] mb-4">
                  Recent Transactions
                </h2>
                <div className="space-y-3">
                  {data?.recentTransactions?.length > 0 ? (
                    data.recentTransactions.slice(0, 5).map((tx: any) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {tx.description || "Ride Payment"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#263238]">
                            £{tx.amount?.toFixed(2)}
                          </p>
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                            {tx.status || "Completed"}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      No recent transactions
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Driver Payout Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-[#263238]">
                  Driver Payouts
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Driver
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Earnings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commission
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net Payout
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rides
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data?.driverPayouts?.length > 0 ? (
                      data.driverPayouts.map((payout: any) => (
                        <tr
                          key={payout.driverId}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {payout.driverName || "Unknown Driver"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {payout.driverEmail}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            £{payout.totalEarnings?.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            £{payout.commission?.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[#00796B]">
                            £{payout.netPayout?.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payout.rideCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                payout.status === "PAID"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {payout.status || "PENDING"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          No payout data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default function FinancePage() {
  return (
    <RoleGate requiredRole={["ADMIN"]}>
      <FinancePageContent />
    </RoleGate>
  );
}

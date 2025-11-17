"use client";
import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import RoleGate from "@/components/RoleGate";

function AdminSettingsContent() {
  const [settings, setSettings] = useState({
    baseFare: 6.0,
    perKm: 1.8,
    wheelchairMult: 1.15,
    requirePickupPin: true,
    sendReceipts: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings(data.settings);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    }
    fetchSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        alert("Settings saved successfully!");
      } else {
        const data = await res.json();
        alert(`Failed to save: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout userRole="ADMIN">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#263238] mb-2">Settings</h1>
          <p className="text-neutral-600">
            Configure system parameters and preferences
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-8">
          {/* Fare Settings Section */}
          <div className="pb-8 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#E0D5DB] rounded-lg">
                <svg
                  className="w-6 h-6 text-[#5C7E9B]"
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
              <h2 className="text-2xl font-semibold text-[#263238]">
                Fare Settings
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Base Fare (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.baseFare}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      baseFare: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C7E9B]/20 focus:border-[#5C7E9B] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Price Per KM (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.perKm}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      perKm: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C7E9B]/20 focus:border-[#5C7E9B] transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Wheelchair Multiplier
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.wheelchairMult}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      wheelchairMult: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5C7E9B]/20 focus:border-[#5C7E9B] transition-all"
                />
                <div className="mt-3 p-3 bg-[#E0D5DB] rounded-lg">
                  <p className="text-sm text-[#263238] font-medium">
                    Current Formula:{" "}
                    <span className="text-[#5C7E9B]">
                      £{settings.baseFare} + £{settings.perKm}/km ×{" "}
                      {settings.wheelchairMult}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Flags Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#E0D5DB] rounded-lg">
                <svg
                  className="w-6 h-6 text-[#5C7E9B]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-[#263238]">
                Feature Flags
              </h2>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-[#E0D5DB]/20 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requirePickupPin}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      requirePickupPin: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-[#5C7E9B] border-gray-300 rounded focus:ring-[#5C7E9B] focus:ring-2"
                />
                <div className="flex-1">
                  <span className="text-[#263238] font-medium">
                    Require pickup PIN verification
                  </span>
                  <p className="text-sm text-neutral-500 mt-1">
                    Riders must enter a PIN before pickup to verify identity
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 hover:bg-[#E0D5DB]/20 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.sendReceipts}
                  onChange={(e) =>
                    setSettings({ ...settings, sendReceipts: e.target.checked })
                  }
                  className="w-5 h-5 text-[#5C7E9B] border-gray-300 rounded focus:ring-[#5C7E9B] focus:ring-2"
                />
                <div className="flex-1">
                  <span className="text-[#263238] font-medium">
                    Send receipt emails automatically
                  </span>
                  <p className="text-sm text-neutral-500 mt-1">
                    Automatically email receipts to riders after ride completion
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-[#5C7E9B] to-[#DAAAB2] text-white font-medium rounded-lg hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </span>
              ) : (
                "Save Settings"
              )}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function AdminSettingsPage() {
  return (
    <RoleGate requiredRole={["ADMIN"]}>
      <AdminSettingsContent />
    </RoleGate>
  );
}

import React from "react";
import LoginHistory from "@/Components/LoginHistory";

/**
 * Standalone Login History page.
 *
 * This route is intentionally kept for direct access (e.g. navigation,
 * bookmarks). It renders the page shell (heading) and delegates the actual
 * table logic to the reusable <LoginHistory /> component so the same UI/API
 * is shared with the Profile page (where it is embedded directly, not via an
 * iframe).
 *
 * The Navbar/Footer you see here come from `_app.tsx` (the global layout).
 * Because the Profile page embeds <LoginHistory /> directly (not this route),
 * there is no duplicate Navbar/Footer when viewed from the Profile page.
 */
export default function UserLoginHistoryPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Login History</h1>
          <p className="text-sm text-gray-500 mb-6">
            Review your recent login attempts.
          </p>
          <LoginHistory />
        </div>
      </div>
    </div>
  );
}

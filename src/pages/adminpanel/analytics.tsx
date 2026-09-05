import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Loader2, RotateCcw } from "lucide-react";
import AdminLayout from "@/Components/AdminLayout";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_URL } from "@/config/api";

type Stats = {
  totalApplications: number;
  acceptedApplications: number;
  applicationsByStatus: { pending: number; accepted: number; rejected: number };
  activeJobs: number;
  activeInternships: number;
  totalUsers: number;
  conversionRate: number;
  trends: {
    applications: number | null;
    jobs: number | null;
    internships: number | null;
    conversionRate: number | null;
  };
};

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">{value.toLocaleString()}</span>
      </div>
      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true); setError(null);
      try {
        const headers = await getAuthHeaders();
        const res = await axios.get(API_URL("/api/admin/dashboard/stats"), { headers });
        if (!mounted) return;
        setStats(res?.data?.data ?? null);
      } catch (e: any) {
        if (!mounted) return;
        const status = e?.response?.status;
        if (status === 401 || status === 403) { router.replace("/adminlogin"); return; }
        setError("Could not load analytics. Please try again.");
      } finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [router]);

  const s = stats;
  const byStatus = s?.applicationsByStatus ?? { pending: 0, accepted: 0, rejected: 0 };
  const statusMax = Math.max(byStatus.pending, byStatus.accepted, byStatus.rejected, 1);
  const contentMax = Math.max(s?.activeJobs ?? 0, s?.activeInternships ?? 0, 1);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">Live platform metrics computed from the database.</p>
      </div>

      {loading && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">
          {error}
          <button type="button" onClick={() => router.reload()} className="ml-4 inline-flex items-center gap-1 underline">
            <RotateCcw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && !s && (
        <div className="bg-white shadow rounded-lg p-10 text-center text-sm text-gray-500">
          No analytics data available yet.
        </div>
      )}

      {!loading && !error && s && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total Users", value: s.totalUsers },
              { label: "Total Applications", value: s.totalApplications },
              { label: "Active Jobs", value: s.activeJobs },
              { label: "Active Internships", value: s.activeInternships },
            ].map((m) => (
              <div key={m.label} className="bg-white shadow rounded-lg p-5">
                <p className="text-sm font-medium text-gray-500">{m.label}</p>
                <p className="mt-1 text-3xl font-semibold text-gray-900">{m.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Applications by status</h2>
              {s.totalApplications === 0 ? (
                <p className="text-sm text-gray-500">No applications have been submitted yet.</p>
              ) : (
                <div className="space-y-4">
                  <Bar label="Pending" value={byStatus.pending} max={statusMax} color="bg-yellow-400" />
                  <Bar label="Accepted" value={byStatus.accepted} max={statusMax} color="bg-green-500" />
                  <Bar label="Rejected" value={byStatus.rejected} max={statusMax} color="bg-red-500" />
                </div>
              )}
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Jobs vs Internships</h2>
              <div className="space-y-4">
                <Bar label="Active jobs" value={s.activeJobs} max={contentMax} color="bg-blue-500" />
                <Bar label="Active internships" value={s.activeInternships} max={contentMax} color="bg-purple-500" />
              </div>
              <div className="mt-6 pt-4 border-t">
                <p className="text-sm text-gray-500">Conversion rate (accepted ÷ total applications)</p>
                <p className="mt-1 text-3xl font-semibold text-gray-900">{s.conversionRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">30-day trends</h2>
            <p className="text-sm text-gray-500 mb-4">
              Change vs the previous 30-day window. “—” means there is not enough historical data yet.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Applications", v: s.trends.applications },
                { label: "Jobs", v: s.trends.jobs },
                { label: "Internships", v: s.trends.internships },
              ].map((t) => (
                <div key={t.label} className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-600">{t.label}</p>
                  <p className={`mt-1 text-2xl font-semibold ${t.v === null ? "text-gray-400" : t.v >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {t.v === null ? "—" : `${t.v > 0 ? "+" : ""}${t.v.toFixed(1)}%`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

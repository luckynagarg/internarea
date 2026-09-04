import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Mail,
  Briefcase,
  Send,
  Users,
  BarChart,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import AdminLayout from "@/Components/AdminLayout";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_URL } from "@/config/api";

type DashboardStats = {
  totalApplications: number;
  acceptedApplications: number;
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

const MENU_ITEMS: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  link: string;
  color: string;
}[] = [
  { title: "View Applications", description: "Search, filter and manage all candidate applications", icon: Mail, link: "/adminpanel/applications", color: "bg-blue-600" },
  { title: "Post Job", description: "Create and publish new job opportunities", icon: Briefcase, link: "/adminpanel/jobs", color: "bg-green-600" },
  { title: "Post Internship", description: "Create and manage internship positions", icon: Send, link: "/adminpanel/internships", color: "bg-purple-600" },
  { title: "Manage Users", description: "View and manage user accounts", icon: Users, link: "/adminpanel/users", color: "bg-orange-600" },
  { title: "Analytics", description: "View detailed reports from live data", icon: BarChart, link: "/adminpanel/analytics", color: "bg-red-600" },
  { title: "Settings", description: "Configure platform preferences", icon: Settings, link: "/adminpanel/settings", color: "bg-gray-600" },
];

function formatTrend(value: number | null | undefined): { text: string; icon: React.ReactNode; color: string } {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return { text: "—", icon: <Minus className="h-4 w-4" />, color: "text-gray-500" };
  }
  const prefix = value > 0 ? "+" : "";
  const color = value > 0 ? "text-green-600" : value < 0 ? "text-red-600" : "text-gray-500";
  const icon = value > 0 ? <TrendingUp className="h-4 w-4" /> : value < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />;
  return { text: `${prefix}${value.toFixed(1)}%`, icon, color };
}

function StatCard({ label, value, trend }: { label: string; value: string; trend: number | null | undefined }) {
  const { text: trendText, icon, color } = formatTrend(trend);
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
          </div>
          <div className={`flex items-center gap-1 text-sm font-medium ${color}`} title="Change vs previous 30 days">
            {icon}
            {trendText}
          </div>
        </div>
      </div>
    </div>
  );
}
export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const headers = await getAuthHeaders();
        const res = await axios.get(API_URL("/api/admin/dashboard/stats"), { headers });
        if (!mounted) return;
        setStats(res?.data?.data ?? null);
      } catch (e: any) {
        if (!mounted) return;
        const status = e?.response?.status;
        if (status === 401 || status === 403) {
          router.replace("/adminlogin");
          return;
        }
        setError("Could not load dashboard statistics. Please try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [router]);

  const s = stats;

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage applications, users and system settings.
        </p>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white shadow rounded-lg p-5 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
              <div className="h-8 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-8 text-sm">
          {error}
          <button type="button" onClick={() => router.reload()} className="ml-4 underline hover:text-red-900">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && s && (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard label="Total Applications" value={s.totalApplications.toLocaleString()} trend={s.trends.applications} />
            <StatCard label="Active Jobs" value={s.activeJobs.toLocaleString()} trend={s.trends.jobs} />
            <StatCard label="Active Internships" value={s.activeInternships.toLocaleString()} trend={s.trends.internships} />
            <StatCard label="Conversion Rate" value={`${s.conversionRate}%`} trend={s.trends.conversionRate} />
          </div>

          <div className="mb-8 bg-white shadow rounded-lg p-5">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">Total Users:</span>{" "}
              {s.totalUsers.toLocaleString()}
            </p>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.link}
              href={item.link}
              className="block bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex items-center">
                  <div className={`${item.color} p-3 rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{item.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </AdminLayout>
  );
}
import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { BarChart3, Users, Mail, Briefcase, Send, RefreshCw } from "lucide-react";
import AdminLayout from "@/Components/AdminLayout";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_URL } from "@/config/api";

type AnalyticsData = {
  totalApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  activeJobs: number;
  activeInternships: number;
  totalUsers: number;
  conversionRate: number;
};

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();

      // Fetch applications data
      const appsRes = await axios.get(
        API_URL("/api/admin/applications"),
        { headers, params: { limit: 1000 } }
      );
      const applications = appsRes?.data?.data || [];

      const totalApplications = applications.length;
      const acceptedApplications = applications.filter(
        (a: { status?: string }) => a.status === "accepted"
      ).length;
      const rejectedApplications = applications.filter(
        (a: { status?: string }) => a.status === "rejected"
      ).length;
      const pendingApplications = applications.filter(
        (a: { status?: string }) => a.status === "pending" || !a.status
      ).length;

      // Fetch jobs data
      const jobsRes = await axios.get(
        API_URL("/api/admin/jobs"),
        { headers, params: { limit: 1000 } }
      );
      const activeJobs = (jobsRes?.data?.data || []).filter(
        (j: { isActive?: boolean }) => j.isActive !== false
      ).length;

      // Fetch internships data
      const internshipsRes = await axios.get(
        API_URL("/api/admin/internships"),
        { headers, params: { limit: 1000 } }
      );
      const activeInternships = (internshipsRes?.data?.data || []).filter(
        (i: { isActive?: boolean }) => i.isActive !== false
      ).length;

      // Fetch users data
      const usersRes = await axios.get(
        API_URL("/api/admin/users"),
        { headers, params: { limit: 1000 } }
      );
      const totalUsers = (usersRes?.data?.data || []).length;

      // Calculate conversion rate
      const conversionRate = totalApplications > 0
        ? Math.round((acceptedApplications / totalApplications) * 100)
        : 0;

      setData({
        totalApplications,
        acceptedApplications,
        rejectedApplications,
        pendingApplications,
        activeJobs,
        activeInternships,
        totalUsers,
        conversionRate,
      });
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        router.replace("/adminlogin");
        return;
      }
      setError("Could not load analytics data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const StatCard = ({
    label,
    value,
    icon: Icon,
    color = "text-blue-600",
    bgColor = "bg-blue-100",
  }: {
    label: string;
    value: string;
    icon: React.ComponentType<{ className?: string }>;
    color?: string;
    bgColor?: string;
  }) => (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center">
        <div className={`${bgColor} p-3 rounded-lg`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-gray-700" />
            Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Platform metrics and insights from real data.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAnalytics}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-white shadow rounded-lg p-6 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
              <div className="h-8 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-8 text-sm">
          {error}
          <button
            type="button"
            onClick={loadAnalytics}
            className="ml-4 underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard
              label="Total Users"
              value={data.totalUsers.toLocaleString()}
              icon={Users}
              color="text-purple-600"
              bgColor="bg-purple-100"
            />
            <StatCard
              label="Total Applications"
              value={data.totalApplications.toLocaleString()}
              icon={Mail}
              color="text-blue-600"
              bgColor="bg-blue-100"
            />
            <StatCard
              label="Active Jobs"
              value={data.activeJobs.toLocaleString()}
              icon={Briefcase}
              color="text-green-600"
              bgColor="bg-green-100"
            />
            <StatCard
              label="Active Internships"
              value={data.activeInternships.toLocaleString()}
              icon={Send}
              color="text-orange-600"
              bgColor="bg-orange-100"
            />
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Applications by Status
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <StatCard
                label="Accepted"
                value={data.acceptedApplications.toLocaleString()}
                icon={Mail}
                color="text-green-600"
                bgColor="bg-green-100"
              />
              <StatCard
                label="Pending"
                value={data.pendingApplications.toLocaleString()}
                icon={Mail}
                color="text-yellow-600"
                bgColor="bg-yellow-100"
              />
              <StatCard
                label="Rejected"
                value={data.rejectedApplications.toLocaleString()}
                icon={Mail}
                color="text-red-600"
                bgColor="bg-red-100"
              />
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Conversion Rate
            </h2>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center gap-6">
                <div className="w-28 h-28 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl font-bold text-blue-600">
                    {data.conversionRate}%
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">
                    Accepted Applications ({data.acceptedApplications.toLocaleString()}) / Total Applications ({data.totalApplications.toLocaleString()})
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Conversion rate is calculated as the percentage of accepted applications out of total applications.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {data.totalApplications === 0 && (
            <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
              No historical data available. Submit applications to see analytics.
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}

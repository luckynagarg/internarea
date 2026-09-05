import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Search, Loader2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import AdminLayout from "@/Components/AdminLayout";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_URL } from "@/config/api";

type Application = {
  _id: string;
  company?: string;
  category?: string;
  coverLetter?: string;
  userId?: string;
  user?: { name?: string; email?: string } | null;
  status?: string;
  createdAt?: string;
};

const STATUS_STYLES: Record<string, string> = {
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
};

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(
    async (q = search, st = status, p = page) => {
      setLoading(true);
      setError(null);
      try {
        const headers = await getAuthHeaders();
        const res = await axios.get(API_URL("/api/admin/applications"), {
          headers,
          params: { page: p, limit: 20, search: q.trim() || undefined, status: st || undefined },
        });
        setRows(res?.data?.data ?? []);
        setTotalPages(res?.data?.pagination?.totalPages ?? 1);
      } catch (e: any) {
        const code = e?.response?.status;
        if (code === 401 || code === 403) {
          router.replace("/adminlogin");
          return;
        }
        setError("Could not load applications. Please try again.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    load(search, status, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load(search, status, 1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  const changeStatus = async (id: string, next: string) => {
    setUpdatingId(id);
    try {
      const headers = await getAuthHeaders();
      await axios.patch(
        API_URL(`/api/admin/applications/${id}/status`),
        { status: next },
        { headers }
      );
      setRows((prev) => prev.map((r) => (r._id === id ? { ...r, status: next } : r)));
    } catch (e: any) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        router.replace("/adminlogin");
        return;
      }
      setError("Failed to update status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <p className="mt-1 text-sm text-gray-500">Search, filter and manage all applications.</p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company, category, user…"
              className="pl-9 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        )}

        {error && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => load(search, status, page)}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
            >
              <RotateCcw className="h-4 w-4" /> Retry
            </button>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-gray-500">
            No applications found.
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <>
            {/* Desktop table - hidden on mobile */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rows.map((r) => (
                    <tr key={r._id}>
                      <td className="px-6 py-4 text-sm text-gray-900">{r.company || "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{r.category || "—"}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{r.user?.name || r.userId || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_STYLES[r.status || "pending"] || STATUS_STYLES.pending}`}>
                          {r.status || "pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <button
                          type="button"
                          disabled={updatingId === r._id || r.status === "accepted"}
                          onClick={() => changeStatus(r._id, "accepted")}
                          className="inline-flex items-center gap-1 text-green-600 hover:text-green-900 disabled:opacity-40 mr-3"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Approve
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === r._id || r.status === "rejected"}
                          onClick={() => changeStatus(r._id, "rejected")}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-900 disabled:opacity-40"
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view - shown only on mobile */}
            <div className="md:hidden space-y-4">
              {rows.map((r) => (
                <div key={r._id} className="bg-white rounded-lg shadow p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{r.company || "—"}</p>
                      <p className="text-sm text-gray-500">{r.category || "—"}</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_STYLES[r.status || "pending"] || STATUS_STYLES.pending}`}>
                      {r.status || "pending"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">User:</span> {r.user?.name || r.userId || "—"}
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Date:</span> {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                  </div>
                  <div className="flex gap-3 pt-2 border-t">
                    <button
                      type="button"
                      disabled={updatingId === r._id || r.status === "accepted"}
                      onClick={() => changeStatus(r._id, "accepted")}
                      className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-900 disabled:opacity-40"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === r._id || r.status === "rejected"}
                      onClick={() => changeStatus(r._id, "rejected")}
                      className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-900 disabled:opacity-40"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-4 border-t gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
            >
              Previous
            </button>
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </div>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
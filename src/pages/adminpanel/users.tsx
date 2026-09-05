import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Search, Loader2, Trash2, X, AlertTriangle } from "lucide-react";
import AdminLayout from "@/Components/AdminLayout";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_URL } from "@/config/api";

type AdminUser = {
  uid: string;
  email: string | null;
  name: string | null;
  nickname: string | null;
  photo: string | null;
  emailVerified: boolean;
  disabled: boolean;
  friendCount: number;
  createdAt: string | null;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<AdminUser | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  const loadUsers = useCallback(async (q = "") => {
    setLoading(true); setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(API_URL("/api/admin/users"), {
        headers,
        params: q.trim() ? { search: q.trim(), limit: 500 } : { limit: 500 },
      });
      setUsers(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) { router.replace("/adminlogin"); return; }
      setError("Could not load users. Please try again.");
      setUsers([]);
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  useEffect(() => {
    const t = setTimeout(() => { loadUsers(search); }, 350);
    return () => clearTimeout(t);
  }, [search, loadUsers]);

  const handleDelete = async () => {
    if (!confirmTarget || deletingUid) return;
    const uid = confirmTarget.uid;
    setDeletingUid(uid);
    try {
      const headers = await getAuthHeaders();
      await axios.delete(API_URL(`/api/admin/users/${encodeURIComponent(uid)}`), { headers });
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      setConfirmTarget(null);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) { router.replace("/adminlogin"); return; }
      setError(e?.response?.data?.message || "Failed to delete the user.");
    } finally { setDeletingUid(null); }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        <p className="mt-1 text-sm text-gray-500">View, search and remove platform user accounts.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6 text-sm">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-4 underline">Dismiss</button>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email, name or uid…"
              className="pl-9 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>}

        {!loading && users.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-gray-500">No users found.</div>
        )}

        {!loading && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verified</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Friends</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.uid}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{u.name || u.nickname || "—"}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{u.email || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${u.emailVerified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {u.emailVerified ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{u.friendCount}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button type="button" onClick={() => setConfirmTarget(u)} className="text-red-600 hover:text-red-900 inline-flex items-center gap-1">
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full"><AlertTriangle className="h-5 w-5 text-red-600" /></div>
                <h2 className="text-lg font-semibold text-gray-900">Delete user</h2>
              </div>
              <button type="button" aria-label="Close" disabled={!!deletingUid} onClick={() => setConfirmTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="mt-4 text-sm text-gray-600">This permanently removes the user and all their data. This action cannot be undone.</p>
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-900">{confirmTarget.name || confirmTarget.nickname || "—"}</div>
              <div className="text-sm text-gray-500">{confirmTarget.email || "No email"}</div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={!!deletingUid} onClick={() => setConfirmTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              <button type="button" disabled={!!deletingUid} onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 inline-flex items-center gap-2">
                {deletingUid && <Loader2 className="h-4 w-4 animate-spin" />}
                {deletingUid ? "Deleting…" : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

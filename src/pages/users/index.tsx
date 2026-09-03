import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { API_URL } from "@/config/api";
import { getAuthHeaders } from "@/lib/authHeaders";
import { toast } from "react-toastify";
import {
  Users as UsersIcon,
  Search,
  Trash2,
  X,
  AlertTriangle,
  MailCheck,
} from "lucide-react";

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

  // Delete confirmation + progress state
  const [confirmTarget, setConfirmTarget] = useState<AdminUser | null>(null);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  const loadUsers = useCallback(async (q = "") => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(API_URL("/api/admin/users"), {
        headers,
        params: q.trim() ? { search: q.trim(), limit: 500 } : { limit: 500 },
      });
      setUsers(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch (e: any) {
      const status = e?.response?.status;
      const msg =
        status === 401
          ? "Please sign in again."
          : status === 403
          ? "Admin access required."
          : "Could not load users.";
      setError(msg);
      setUsers([]);

      // Redirect to admin login on auth failures.
      if (status === 401 || status === 403) {
        router.push("/adminlogin");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Debounced server-side search.
  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, loadUsers]);

  const handleDelete = async () => {
    if (!confirmTarget || deletingUid) return;
    const uid = confirmTarget.uid;
    setDeletingUid(uid);
    try {
      const headers = await getAuthHeaders();
      await axios.delete(
        API_URL(`/api/admin/users/${encodeURIComponent(uid)}`),
        { headers }
      );
      // Remove from the table immediately.
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      toast.success("User deleted successfully.");
      setConfirmTarget(null);
    } catch (e: any) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.message ||
        (status === 404
          ? "User not found."
          : status === 403
          ? "Admin access required."
          : status === 401
          ? "Please sign in again."
          : "Failed to delete the user.");
      // Keep the user in the table; show the actual error.
      toast.error(msg);

      // Redirect to admin login on auth failures.
      if (status === 401 || status === 403) {
        router.push("/adminlogin");
      }
    } finally {
      setDeletingUid(null);
    }
  };

  const initials = (u: AdminUser) =>
    (u.name || u.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-gray-700" />
            Manage Users
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage user accounts.
          </p>
        </div>

        {/* Search */}
        <div className="mb-4 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, name or ID..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
            Loading users...
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow p-10 text-center">
            <p className="text-red-600 mb-3">{error}</p>
            <button
              type="button"
              onClick={() => loadUsers(search)}
              className="text-sm text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
            No users found.
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Friends</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.uid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {u.photo ? (
                          <img src={u.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                            {initials(u)}
                          </div>
                        )}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {u.name || u.nickname || "—"}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">{u.uid.substring(0, 12)}…</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        {u.email || "—"}
                        {u.emailVerified && <MailCheck size={14} className="text-green-600" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {u.disabled ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Disabled</span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.friendCount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        title="Delete user"
                        aria-label="Delete user"
                        disabled={deletingUid !== null}
                        onClick={() => setConfirmTarget(u)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {deletingUid === u.uid ? (
                          <span className="inline-block h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Confirmation modal */}
        {confirmTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !deletingUid)
                setConfirmTarget(null);
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Delete user
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  disabled={!!deletingUid}
                  onClick={() => setConfirmTarget(null)}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-40"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="mt-4 text-sm text-gray-600">
                Are you sure you want to delete this user? This action cannot be
                undone.
              </p>

              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-900">
                  {confirmTarget.name || confirmTarget.nickname || "—"}
                </div>
                <div className="text-sm text-gray-500">
                  {confirmTarget.email || "No email"}
                </div>
                <div className="text-xs text-gray-400 font-mono mt-1">
                  {confirmTarget.uid}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={!!deletingUid}
                  onClick={() => setConfirmTarget(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!!deletingUid}
                  onClick={handleDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deletingUid ? (
                    <>
                      <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete User"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


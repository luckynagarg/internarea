import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Loader2, Plus, Archive, RotateCcw, Trash2, X } from "lucide-react";
import AdminLayout from "@/Components/AdminLayout";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_URL } from "@/config/api";

type Job = {
  _id: string;
  title?: string;
  company?: string;
  location?: string;
  category?: string;
  CTC?: string;
  isActive?: boolean;
  createAt?: string;
};

const EMPTY_FORM = {
  title: "",
  company: "",
  location: "",
  category: "",
  aboutCompany: "",
  aboutJob: "",
  whoCanApply: "",
  perks: "",
  AdditionalInfo: "",
  CTC: "",
  StartDate: "",
};

export default function AdminJobsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(API_URL("/api/admin/jobs"), { headers, params: { limit: 100 } });
      setRows(res?.data?.data ?? []);
    } catch (e: any) {
      const code = e?.response?.status;
      if (code === 401 || code === 403) {
        router.replace("/adminlogin");
        return;
      }
      setError("Could not load jobs. Please try again.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (job: Job) => {
    setEditingId(job._id);
    setForm({
      title: job.title || "",
      company: job.company || "",
      location: job.location || "",
      category: job.category || "",
      aboutCompany: "",
      aboutJob: "",
      whoCanApply: "",
      perks: "",
      AdditionalInfo: "",
      CTC: job.CTC || "",
      StartDate: "",
    });
    setModalOpen(true);
  };

  const saveJob = async () => {
    if (!form.title.trim() || !form.company.trim() || !form.category.trim()) {
      setError("Title, company and category are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      if (editingId) {
        await axios.patch(API_URL(`/api/admin/jobs/${editingId}`), form, { headers });
      } else {
        await axios.post(API_URL("/api/admin/jobs"), form, { headers });
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      const code = e?.response?.status;
      if (code === 401 || code === 403) {
        router.replace("/adminlogin");
        return;
      }
      setError("Failed to save job. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (job: Job) => {
    try {
      const headers = await getAuthHeaders();
      await axios.patch(API_URL(`/api/admin/jobs/${job._id}`), { isActive: !job.isActive }, { headers });
      setRows((prev) => prev.map((r) => (r._id === job._id ? { ...r, isActive: !job.isActive } : r)));
    } catch (e: any) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        router.replace("/adminlogin");
      }
    }
  };

  const remove = async (job: Job) => {
    if (!window.confirm("Delete this job permanently?")) return;
    try {
      const headers = await getAuthHeaders();
      await axios.delete(API_URL(`/api/admin/jobs/${job._id}`), { headers });
      setRows((prev) => prev.filter((r) => r._id !== job._id));
    } catch (e: any) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        router.replace("/adminlogin");
      }
    }
  };

  const inputCls =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="mt-1 text-sm text-gray-500">Create, edit, publish and archive jobs.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> New Job
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6 text-sm">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-4 underline">Dismiss</button>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-gray-500">
            No jobs found. Click “New Job” to create one.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CTC</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((job) => (
                  <tr key={job._id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{job.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{job.company}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{job.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{job.CTC || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${job.isActive === false ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-800"}`}>
                        {job.isActive === false ? "Archived" : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap space-x-3">
                      <button type="button" onClick={() => openEdit(job)} className="text-blue-600 hover:text-blue-900">Edit</button>
                      <button type="button" onClick={() => toggleActive(job)} className={job.isActive === false ? "text-green-600 hover:text-green-900 inline-flex items-center gap-1" : "text-amber-600 hover:text-amber-900 inline-flex items-center gap-1"}>
                        {job.isActive === false ? (<><RotateCcw className="h-4 w-4" /> Publish</>) : (<><Archive className="h-4 w-4" /> Archive</>)}
                      </button>
                      <button type="button" onClick={() => remove(job)} className="text-red-600 hover:text-red-900 inline-flex items-center gap-1">
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Job" : "New Job"}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title *</label>
                <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Company *</label>
                <input className={inputCls} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category *</label>
                <input className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">CTC</label>
                <input className={inputCls} value={form.CTC} onChange={(e) => setForm({ ...form, CTC: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="button" onClick={saveJob} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? "Save Changes" : "Create Job"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Loader2, Plus, Archive, RotateCcw, Trash2, X } from "lucide-react";
import AdminLayout from "@/Components/AdminLayout";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_URL } from "@/config/api";

type Internship = {
  _id: string;
  title?: string;
  company?: string;
  location?: string;
  category?: string;
  stipend?: string;
  numberOfOpening?: string;
  duration?: string;
  aboutCompany?: string;
  aboutInternship?: string;
  whoCanApply?: string;
  perks?: string;
  startDate?: string;
  applicationDeadline?: string;
  skillsRequired?: string;
  isActive?: boolean;
};

const EMPTY = {
  title: "", company: "", location: "", category: "",
  aboutCompany: "", aboutInternship: "", whoCanApply: "",
  perks: "", numberOfOpening: "", stipend: "", startDate: "", additionalInfo: "",
  duration: "", applicationDeadline: "", skillsRequired: "",
};

const inputCls = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function AdminInternshipsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const headers = await getAuthHeaders();
      const source = axios.CancelToken.source();
      const timeout = setTimeout(() => source.cancel("Request timed out"), 15000);
      const res = await axios.get(API_URL("/api/admin/internships"), {
        headers,
        params: { limit: 100 },
        cancelToken: source.token,
      });
      clearTimeout(timeout);
      if (res?.data?.success === false) {
        throw new Error(res.data.message || "API returned failure");
      }
      setRows(res?.data?.data ?? []);
    } catch (e: any) {
      if (axios.isCancel(e)) {
        setError("Request timed out. Please check your connection.");
        setRows([]);
        return;
      }
      if (e?.response?.status === 401 || e?.response?.status === 403) { router.replace("/adminlogin"); return; }
      setError(e?.response?.data?.message || e?.message || "Could not load internships. Please try again."); setRows([]);
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.title.trim() || !form.company.trim() || !form.category.trim()) {
      setError("Title, company and category are required."); return;
    }
    setSaving(true); setError(null);
    try {
      const headers = await getAuthHeaders();
      const source = axios.CancelToken.source();
      const timeout = setTimeout(() => source.cancel("Request timed out"), 15000);
      if (editingId) await axios.patch(API_URL(`/api/admin/internships/${editingId}`), form, { headers, cancelToken: source.token });
      else await axios.post(API_URL("/api/admin/internships"), form, { headers, cancelToken: source.token });
      clearTimeout(timeout);
      setModalOpen(false); setForm(EMPTY); setEditingId(null);
      await load();
    } catch (e: any) {
      if (axios.isCancel(e)) {
        setError("Request timed out. Please try again.");
        return;
      }
      if (e?.response?.status === 401 || e?.response?.status === 403) { router.replace("/adminlogin"); return; }
      setError(e?.response?.data?.message || e?.message || "Failed to save internship. Please try again.");
    } finally { setSaving(false); }
  };

  const toggleActive = async (it: Internship) => {
    try {
      const headers = await getAuthHeaders();
      await axios.patch(API_URL(`/api/admin/internships/${it._id}`), { isActive: !it.isActive }, { headers });
      setRows((prev) => prev.map((r) => (r._id === it._id ? { ...r, isActive: !it.isActive } : r)));
    } catch (e: any) {
      if (e?.response?.status === 401 || e?.response?.status === 403) router.replace("/adminlogin");
    }
  };

  const remove = async (it: Internship) => {
    if (!window.confirm("Delete this internship permanently?")) return;
    try {
      const headers = await getAuthHeaders();
      await axios.delete(API_URL(`/api/admin/internships/${it._id}`), { headers });
      setRows((prev) => prev.filter((r) => r._id !== it._id));
    } catch (e: any) {
      if (e?.response?.status === 401 || e?.response?.status === 403) router.replace("/adminlogin");
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Internships</h1>
          <p className="mt-1 text-sm text-gray-500">Create, edit, publish and archive internships.</p>
        </div>
        <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); setModalOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus className="h-4 w-4" /> New Internship
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6 text-sm">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-4 underline">Dismiss</button>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>}

        {!loading && rows.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-gray-500">No internships found. Click “New Internship” to create one.</div>
        )}

        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stipend</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((it) => (
                  <tr key={it._id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{it.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{it.company}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{it.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{it.stipend || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${it.isActive === false ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-800"}`}>
                        {it.isActive === false ? "Archived" : "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap space-x-3">
                      <button type="button" onClick={() => { setEditingId(it._id); setForm({ ...EMPTY, title: it.title || "", company: it.company || "", location: it.location || "", category: it.category || "", stipend: it.stipend || "", numberOfOpening: it.numberOfOpening || "" }); setModalOpen(true); }} className="text-blue-600 hover:text-blue-900">Edit</button>
                      <button type="button" onClick={() => toggleActive(it)} className={it.isActive === false ? "text-green-600 hover:text-green-900 inline-flex items-center gap-1" : "text-amber-600 hover:text-amber-900 inline-flex items-center gap-1"}>
                        {it.isActive === false ? (<><RotateCcw className="h-4 w-4" /> Publish</>) : (<><Archive className="h-4 w-4" /> Archive</>)}
                      </button>
                      <button type="button" onClick={() => remove(it)} className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"><Trash2 className="h-4 w-4" /> Delete</button>
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
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? "Edit Internship" : "New Internship"}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700">Internship Title *</label>
                <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Web Development Intern" /></div>
              <div><label className="block text-sm font-medium text-gray-700">Company *</label>
                <input className={inputCls} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="e.g. Microsoft" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">Location</label>
                  <input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Remote / Delhi" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Category *</label>
                  <input className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Technology" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">Stipend (₹)</label>
                  <input className={inputCls} value={form.stipend} onChange={(e) => setForm({ ...form, stipend: e.target.value })} placeholder="e.g. ₹15,000 / month" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Duration</label>
                  <input className={inputCls} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 3 months, 6 months" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">Number of Openings</label>
                  <input className={inputCls} value={form.numberOfOpening} onChange={(e) => setForm({ ...form, numberOfOpening: e.target.value })} placeholder="e.g. 5" /></div>
                <div><label className="block text-sm font-medium text-gray-700">Application Deadline</label>
                  <input type="date" className={inputCls} value={form.applicationDeadline} onChange={(e) => setForm({ ...form, applicationDeadline: e.target.value })} /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700">About Company</label>
                <textarea className={inputCls} rows={2} value={form.aboutCompany} onChange={(e) => setForm({ ...form, aboutCompany: e.target.value })} placeholder="Brief description about the company..." /></div>
              <div><label className="block text-sm font-medium text-gray-700">About Internship</label>
                <textarea className={inputCls} rows={2} value={form.aboutInternship} onChange={(e) => setForm({ ...form, aboutInternship: e.target.value })} placeholder="Roles and responsibilities..." /></div>
              <div><label className="block text-sm font-medium text-gray-700">Skills Required</label>
                <input className={inputCls} value={form.skillsRequired} onChange={(e) => setForm({ ...form, skillsRequired: e.target.value })} placeholder="e.g. HTML, CSS, JavaScript" /></div>
              <div><label className="block text-sm font-medium text-gray-700">Who Can Apply</label>
                <input className={inputCls} value={form.whoCanApply} onChange={(e) => setForm({ ...form, whoCanApply: e.target.value })} placeholder="e.g. Students, Freshers" /></div>
              <div><label className="block text-sm font-medium text-gray-700">Perks &amp; Benefits</label>
                <input className={inputCls} value={form.perks} onChange={(e) => setForm({ ...form, perks: e.target.value })} placeholder="e.g. Certificate, Flexible hours" /></div>
              <div><label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input type="date" className={inputCls} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700">Additional Info</label>
                <textarea className={inputCls} rows={2} value={form.additionalInfo} onChange={(e) => setForm({ ...form, additionalInfo: e.target.value })} placeholder="Any other details..." /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? "Save Changes" : "Create Internship"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

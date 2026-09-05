import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Loader2, Save } from "lucide-react";
import AdminLayout from "@/Components/AdminLayout";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_URL } from "@/config/api";

type Settings = {
  platform: { siteName: string; supportEmail: string; maxApplicationsPerFree: number; enablePublicSpace: boolean };
  content: { requireApprovalForJobs: boolean; requireApprovalForInternships: boolean; maxCaptionLength: number };
  notifications: { enableEmailNotifications: boolean; enableSocialNotifications: boolean };
};

const DEFAULTS: Settings = {
  platform: { siteName: "InternArea", supportEmail: "", maxApplicationsPerFree: 1, enablePublicSpace: true },
  content: { requireApprovalForJobs: false, requireApprovalForInternships: false, maxCaptionLength: 5000 },
  notifications: { enableEmailNotifications: true, enableSocialNotifications: true },
};

const inputCls = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [form, setForm] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true); setError(null);
      try {
        const headers = await getAuthHeaders();
        const res = await axios.get(API_URL("/api/admin/settings"), { headers });
        if (!mounted) return;
        const data = res?.data?.data;
        if (data) {
          setForm({
            platform: { ...DEFAULTS.platform, ...(data.platform || {}) },
            content: { ...DEFAULTS.content, ...(data.content || {}) },
            notifications: { ...DEFAULTS.notifications, ...(data.notifications || {}) },
          });
        }
      } catch (e: any) {
        if (!mounted) return;
        const status = e?.response?.status;
        if (status === 401 || status === 403) { router.replace("/adminlogin"); return; }
        setError("Could not load settings. Please try again.");
      } finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [router]);

  const toggle = (checked: boolean, onChange: (v: boolean) => void) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-gray-300"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );

  const save = async () => {
    if (form.platform.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.platform.supportEmail)) {
      setError("Support email is not a valid email address.");
      return;
    }
    setSaving(true); setError(null); setSavedMsg(null);
    try {
      const headers = await getAuthHeaders();
      await axios.put(API_URL("/api/admin/settings"), form, { headers });
      setSavedMsg("Settings saved successfully.");
      setTimeout(() => setSavedMsg(null), 4000);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) { router.replace("/adminlogin"); return; }
      setError("Failed to save settings. Please try again.");
    } finally { setSaving(false); }
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Platform configuration, persisted in the database.</p>
        </div>
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6 text-sm">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-4 underline">Dismiss</button>
        </div>
      )}
      {savedMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 mb-6 text-sm">{savedMsg}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Site name</label>
                <input className={inputCls} value={form.platform.siteName} onChange={(e) => setForm({ ...form, platform: { ...form.platform, siteName: e.target.value } })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Support email</label>
                <input className={inputCls} type="email" value={form.platform.supportEmail} onChange={(e) => setForm({ ...form, platform: { ...form.platform, supportEmail: e.target.value } })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max applications (free plan / month)</label>
                <input className={inputCls} type="number" min={0} value={form.platform.maxApplicationsPerFree} onChange={(e) => setForm({ ...form, platform: { ...form.platform, maxApplicationsPerFree: Number(e.target.value) || 0 } })} />
              </div>
              <div className="flex items-center justify-between sm:justify-start sm:gap-4 pt-5">
                <span className="text-sm font-medium text-gray-700">Enable Public Space</span>
                {toggle(form.platform.enablePublicSpace, (v) => setForm({ ...form, platform: { ...form.platform, enablePublicSpace: v } }))}
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Content</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Require approval for new jobs</span>
                {toggle(form.content.requireApprovalForJobs, (v) => setForm({ ...form, content: { ...form.content, requireApprovalForJobs: v } }))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Require approval for new internships</span>
                {toggle(form.content.requireApprovalForInternships, (v) => setForm({ ...form, content: { ...form.content, requireApprovalForInternships: v } }))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max post caption length</label>
                <input className={inputCls} type="number" min={100} max={20000} value={form.content.maxCaptionLength} onChange={(e) => setForm({ ...form, content: { ...form.content, maxCaptionLength: Number(e.target.value) || 5000 } })} />
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Email notifications</span>
                {toggle(form.notifications.enableEmailNotifications, (v) => setForm({ ...form, notifications: { ...form.notifications, enableEmailNotifications: v } }))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Social notifications (likes/comments)</span>
                {toggle(form.notifications.enableSocialNotifications, (v) => setForm({ ...form, notifications: { ...form.notifications, enableSocialNotifications: v } }))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

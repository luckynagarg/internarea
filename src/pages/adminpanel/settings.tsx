import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { Settings as SettingsIcon, Loader2, Save, Globe, Bell, Users } from "lucide-react";
import AdminLayout from "@/Components/AdminLayout";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_URL } from "@/config/api";
import { toast } from "react-toastify";

type PlatformSettings = {
  platform: {
    siteName: string;
    supportEmail: string;
    maxApplicationsPerFree: number;
    enablePublicSpace: boolean;
  };
  content: {
    requireApprovalForJobs: boolean;
    requireApprovalForInternships: boolean;
    maxCaptionLength: number;
  };
  notifications: {
    enableEmailNotifications: boolean;
    enableSocialNotifications: boolean;
  };
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      setLoading(true);
      setError(null);
      try {
        const headers = await getAuthHeaders();
        const res = await axios.get(API_URL("/api/admin/settings"), { headers });
        if (!mounted) return;

        if (res?.data?.success) {
          setSettings(res.data.data);
        } else {
          setError("Unexpected response from server.");
        }
      } catch (e: any) {
        if (!mounted) return;
        const status = e?.response?.status;
        if (status === 401 || status === 403) {
          router.replace("/adminlogin");
          return;
        }
        setError("Could not load settings. Please try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadSettings();
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.put(API_URL("/api/admin/settings"), settings, { headers });
      if (res?.data?.success) {
        setSettings(res.data.data);
        toast.success("Settings saved successfully.");
        setChanged(false);
      } else {
        throw new Error(res?.data?.message || "Failed to save settings.");
      }
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        router.replace("/adminlogin");
        return;
      }
      toast.error(e?.response?.data?.message || "Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updatePlatform = (key: keyof PlatformSettings["platform"], value: string | number | boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      platform: { ...settings.platform, [key]: value },
    });
    setChanged(true);
  };

  const updateContent = (key: keyof PlatformSettings["content"], value: boolean | number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      content: { ...settings.content, [key]: value },
    });
    setChanged(true);
  };

  const updateNotifications = (key: keyof PlatformSettings["notifications"], value: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notifications: { ...settings.notifications, [key]: value },
    });
    setChanged(true);
  };

  const SettingToggle = ({
    label,
    description,
    enabled,
    onChange,
  }: {
    label: string;
    description: string;
    enabled: boolean;
    onChange: () => void;
  }) => (
    <div className="py-3 flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        onClick={onChange}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          enabled ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            enabled ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );

  const inputCls =
    "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-gray-700" />
            Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure platform preferences.
          </p>
        </div>
        {settings && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !changed}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6 text-sm">
          {error}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ml-4 underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && settings && (
        <div className="space-y-6">
          {/* Platform Settings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-gray-600" />
              Platform Settings
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Name
                </label>
                <input
                  type="text"
                  value={settings.platform.siteName || ""}
                  onChange={(e) => updatePlatform("siteName", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  value={settings.platform.supportEmail || ""}
                  onChange={(e) => updatePlatform("supportEmail", e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Applications Per Free Account
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.platform.maxApplicationsPerFree || 0}
                  onChange={(e) => updatePlatform("maxApplicationsPerFree", parseInt(e.target.value) || 0)}
                  className={inputCls}
                />
              </div>
              <div className="flex items-end">
                <SettingToggle
                  label="Enable Public Space"
                  description="Allow public browsing of jobs and internships"
                  enabled={settings.platform.enablePublicSpace}
                  onChange={() => updatePlatform("enablePublicSpace", !settings.platform.enablePublicSpace)}
                />
              </div>
            </div>
          </div>

          {/* Content Settings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600" />
              Content Settings
            </h2>
            <div className="border-t border-gray-200">
              <SettingToggle
                label="Require Approval for Jobs"
                description="New jobs must be approved before publishing"
                enabled={settings.content.requireApprovalForJobs}
                onChange={() => updateContent("requireApprovalForJobs", !settings.content.requireApprovalForJobs)}
              />
              <SettingToggle
                label="Require Approval for Internships"
                description="New internships must be approved before publishing"
                enabled={settings.content.requireApprovalForInternships}
                onChange={() => updateContent("requireApprovalForInternships", !settings.content.requireApprovalForInternships)}
              />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Caption Length
              </label>
              <input
                type="number"
                min="1"
                value={settings.content.maxCaptionLength || 0}
                onChange={(e) => updateContent("maxCaptionLength", parseInt(e.target.value) || 0)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-600" />
              Notifications
            </h2>
            <div className="border-t border-gray-200">
              <SettingToggle
                label="Email Notifications"
                description="Send email notifications for important events"
                enabled={settings.notifications.enableEmailNotifications}
                onChange={() => updateNotifications("enableEmailNotifications", !settings.notifications.enableEmailNotifications)}
              />
              <SettingToggle
                label="Social Notifications"
                description="Send social notifications (likes, comments, etc.)"
                enabled={settings.notifications.enableSocialNotifications}
                onChange={() => updateNotifications("enableSocialNotifications", !settings.notifications.enableSocialNotifications)}
              />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

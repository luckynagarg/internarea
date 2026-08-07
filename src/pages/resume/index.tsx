import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FileText,
  Plus,
  Download,
  Trash2,
  Copy,
  Share2,
  Loader2,
  Eye,
  EyeOff,
  Pencil,
  AlertCircle,
} from 'lucide-react';
import { getAuthHeaders } from '@/lib/authHeaders';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type ResumeItem = {
  _id: string;
  userId: string;
  resumeData: any;
  photoUrl: string | null;
  resumePdfPath: string | null;
  status: string;
  visibility: 'public' | 'private';
  createdAt: string;
  updatedAt: string;
};

export default function ResumeDashboard() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.get(`${API_BASE}/api/resume/my-resumes`, { headers });
      const data = res?.data?.data ?? [];
      setResumes(Array.isArray(data) ? data : []);
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || e?.response?.data?.message || 'Failed to load resumes.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDownload(r: ResumeItem) {
    try {
      setActionId(r._id);
      const headers = await getAuthHeaders();
      // window.open can't send Authorization header, so fetch the file with
      // authenticated headers and trigger a client-side download.
      const res = await fetch(`${API_BASE}/api/resume/resumes/${r._id}/download`, {
        headers: { ...headers },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error('Failed to download resume.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_${r._id}.${blob.type.includes('html') ? 'html' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Resume downloaded.');
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || e?.message || 'Failed to download resume.');
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(r: ResumeItem) {
    if (!window.confirm('Are you sure you want to delete this resume?')) return;
    setActionId(r._id);
    try {
      const headers = await getAuthHeaders();
      await axios.delete(`${API_BASE}/api/resume/${r._id}`, { headers });
      toast.success('Resume deleted.');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to delete resume.');
    } finally {
      setActionId(null);
    }
  }

  async function handleDuplicate(r: ResumeItem) {
    setActionId(r._id);
    try {
      const headers = await getAuthHeaders();
      await axios.post(`${API_BASE}/api/resume/${r._id}/duplicate`, {}, { headers });
      toast.success('Resume duplicated.');
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to duplicate resume.');
    } finally {
      setActionId(null);
    }
  }

  async function handleToggleVisibility(r: ResumeItem) {
    const next = r.visibility === 'public' ? 'private' : 'public';
    setActionId(r._id);
    try {
      const headers = await getAuthHeaders();
      await axios.patch(`${API_BASE}/api/resume/${r._id}/visibility`, { visibility: next }, { headers });
      toast.success(`Resume is now ${next}.`);
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to update visibility.');
    } finally {
      setActionId(null);
    }
  }

  async function handleShare(r: ResumeItem) {
    setActionId(r._id);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.post(`${API_BASE}/api/resume/${r._id}/share`, {}, { headers });
      const shareUrl = res?.data?.shareUrl;
      if (shareUrl) {
        await navigator.clipboard?.writeText(shareUrl).catch(() => {});
        toast.success('Share link copied to clipboard.');
      } else {
        toast.error('Could not generate share link.');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to share resume.');
    } finally {
      setActionId(null);
    }
  }

  function getTitle(r: ResumeItem) {
    return r.resumeData?.resumeTitle || r.resumeData?.fullName || r.resumeData?.personalInfo?.email || 'Untitled Resume';
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="text-blue-600" /> My Resumes
            </h1>
            <p className="text-gray-600 mt-1">Create, manage, and share your professional resumes.</p>
          </div>
          <Link
            href="/resume/create"
            className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={18} /> Create Resume
          </Link>
        </div>

        {loading && (
          <div className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-700">Loading your resumes...</span>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-4 flex items-center gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {!loading && !error && resumes.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">📄</div>
            <h2 className="text-xl font-semibold text-gray-900">No resumes yet</h2>
            <p className="text-gray-600 mt-2 max-w-md mx-auto">
              Create your first professional resume. Pay ₹50, verify via email OTP, and get a polished PDF.
            </p>
            <Link
              href="/resume/create"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={18} /> Create Your First Resume
            </Link>
          </div>
        )}

        {!loading && !error && resumes.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumes.map((r) => (
              <div key={r._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{getTitle(r)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(r.updatedAt || r.createdAt).toLocaleDateString()}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-full ${
                        r.status === 'generated'
                          ? 'bg-green-100 text-green-800'
                          : r.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {r.status}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 ml-2 text-xs px-2 py-0.5 rounded-full ${
                        r.visibility === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {r.visibility === 'public' ? <Eye size={12} /> : <EyeOff size={12} />}
                      {r.visibility}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => router.push(`/resume/create?edit=${r._id}`)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(r)}
                    disabled={r.status !== 'generated'}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40"
                    title="Download PDF"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicate(r)}
                    disabled={actionId === r._id}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40"
                    title="Duplicate"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShare(r)}
                    disabled={actionId === r._id}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40"
                    title="Share"
                  >
                    <Share2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(r)}
                    disabled={actionId === r._id}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 disabled:opacity-40"
                    title="Toggle visibility"
                  >
                    {r.visibility === 'public' ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r)}
                    disabled={actionId === r._id}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-40 ml-auto"
                    title="Delete"
                  >
                    {actionId === r._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

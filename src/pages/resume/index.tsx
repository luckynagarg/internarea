import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axiosClient from '@/lib/apiClient';
import { toast } from 'react-toastify';
import {
  Plus,
  FileText,
  Eye,
  Download,
  Trash2,
  Copy,
  Pencil,
  Share2,
  Globe,
  Lock,
  Loader2,
  FilePlus2,
} from 'lucide-react';

type ResumeItem = {
  _id: string;
  userId: string;
  resumeData?: {
    fullName?: string;
    qualifications?: string;
    experience?: string;
    personalInfo?: {
      email?: string;
      phone?: string;
      location?: string;
      linkedin?: string;
      website?: string;
    };
  };
  photoUrl?: string | null;
  resumePdfPath?: string | null;
  visibility?: 'private' | 'public';
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function ResumeHome() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadResumes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get('/api/resume/my-resumes');
      setResumes(res?.data?.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Failed to load resumes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  async function runAction(id: string, fn: () => Promise<any>, successMsg: string) {
    setActionId(id);
    try {
      await fn();
      toast.success(successMsg);
      await loadResumes();
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || e?.response?.data?.message || 'Action failed.');
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(r: ResumeItem) {
    if (!window.confirm('Delete this resume?')) return;
    await runAction(r._id, () => axiosClient.delete(`/api/resume/${r._id}`), 'Resume deleted.');
  }

  async function handleDuplicate(r: ResumeItem) {
    await runAction(r._id, () => axiosClient.post(`/api/resume/${r._id}/duplicate`), 'Resume duplicated.');
  }

  async function handleToggleVisibility(r: ResumeItem) {
    const next = r.visibility === 'public' ? 'private' : 'public';
    await runAction(
      r._id,
      () => axiosClient.patch(`/api/resume/${r._id}/visibility`, { visibility: next }),
      next === 'public' ? 'Resume is now public.' : 'Resume is now private.'
    );
  }

  async function handleDownload(r: ResumeItem) {
    setActionId(r._id);
    try {
      const res = await axiosClient.get(`/api/resume/resumes/${r._id}/download`, {
        responseType: 'blob',
      });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_${r._id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Downloading resume...');
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to download resume.');
    } finally {
      setActionId(null);
    }
  }

  async function handleShare(r: ResumeItem) {
    if (r.visibility !== 'public') {
      toast.info('Set resume to public first to share.');
      return;
    }
    const url = `${window.location.origin}/resume/preview/${r._id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied to clipboard.');
    } catch {
      toast.info(url);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="text-blue-600" /> My Resumes
              </h1>
              <p className="text-gray-600 mt-1">
                Create, manage, and share professional resumes.
              </p>
            </div>
            <Link
              href="/resume/create"
              className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={18} /> Create Resume
            </Link>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <div className="mt-3 text-gray-600">Loading resumes...</div>
            </div>
          ) : resumes.length === 0 ? (
            <div className="py-16 text-center">
              <FilePlus2 className="h-14 w-14 text-gray-300 mx-auto" />
              <div className="mt-4 text-lg font-semibold text-gray-900">No resumes yet</div>
              <p className="text-gray-600 mt-1">
                Create your first professional resume and get it generated as a PDF.
              </p>
              <Link
                href="/resume/create"
                className="inline-flex items-center gap-2 mt-6 px-5 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
              >
                <Plus size={18} /> Create Your First Resume
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {resumes.map((r) => {
                const name = r.resumeData?.fullName || 'Untitled Resume';
                const isPublic = r.visibility === 'public';
                return (
                  <div key={r._id} className="border rounded-xl p-4 flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {r.status || 'Draft'} · {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recently'}
                        </div>
                        <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium">
                          {isPublic ? (
                            <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                              <Globe size={12} /> Public
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                              <Lock size={12} /> Private
                            </span>
                          )}
                        </div>
                      </div>
                      {r.photoUrl && (
                        <img src={r.photoUrl} alt="resume" className="w-12 h-12 rounded-lg object-cover border" />
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t flex flex-wrap gap-2">
                      <Link
                        href={`/resume/preview/${r._id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        <Eye size={14} /> Preview
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDownload(r)}
                        disabled={actionId === r._id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                      >
                        <Download size={14} /> Download
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/resume/create`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(r)}
                        disabled={actionId === r._id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                      >
                        <Copy size={14} /> Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => handleShare(r)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        <Share2 size={14} /> Share
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(r)}
                        disabled={actionId === r._id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 disabled:opacity-50"
                      >
                        {isPublic ? <Lock size={14} /> : <Globe size={14} />} {isPublic ? 'Make Private' : 'Make Public'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        disabled={actionId === r._id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50"
                      >
                        {actionId === r._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

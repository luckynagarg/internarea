import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n/runtime';
import { useRouter } from 'next/router';
import axiosClient from '@/lib/apiClient';
import { Loader2, AlertCircle, ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';

type ResumeData = {
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

export default function ResumePreviewPage() {
  const { t } = useT();
  const router = useRouter();
  const { id } = router.query;
  const resumeId = typeof id === 'string' ? id : null;

  const [resume, setResume] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resumeId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axiosClient.get(`/api/resume/${resumeId}`);
        if (!mounted) return;
        setResume(res?.data?.data);
      } catch (e: any) {
        if (!mounted) return;
        setError(t('common.error'));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [resumeId]);

  async function handleDownload() {
    if (!resume?._id) return;
    try {
      const res = await axiosClient.get(`/api/resume/resumes/${resume._id}/download`, {
        responseType: 'blob',
      });
      const blob = res.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_${resume._id}.${blob.type?.includes('html') ? 'html' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(t('common.error'));
    }
  }

  const d: ResumeData = resume?.resumeData || {};

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/resume" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft size={18} /> {t('common.back')}
          </Link>
          {resume?._id && (
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download size={16} /> {t('common.download')}
            </button>
          )}
        </div>

        {loading && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <div className="mt-3 text-gray-600">{t('common.loading')}</div>
          </div>
        )}

        {!loading && error && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
            <div className="mt-3 text-red-700">{error}</div>
          </div>
        )}

        {!loading && !error && resume && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="h-3 bg-gradient-to-r from-blue-500 to-indigo-600" />
            <div className="p-8">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{d.fullName || t('common.untitledResume')}</h1>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    {d.personalInfo?.email && <div>{d.personalInfo.email}</div>}
                    {d.personalInfo?.phone && <div>{d.personalInfo.phone}</div>}
                    {d.personalInfo?.location && <div>{d.personalInfo.location}</div>}
                    {d.personalInfo?.linkedin && <div>{d.personalInfo.linkedin}</div>}
                    {d.personalInfo?.website && <div>{d.personalInfo.website}</div>}
                  </div>
                </div>
                {resume.photoUrl && (
                  <img src={resume.photoUrl} alt={t('common.view')} className="w-24 h-24 rounded-lg object-cover border" />
                )}
              </div>

              <div className="mt-8">
                <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wide">{t('resume.qualifications')}</h2>
                <div className="mt-2 text-gray-800 whitespace-pre-wrap">{d.qualifications || t('common.notProvided')}</div>
              </div>

              <div className="mt-8">
                <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wide">{t('resume.experience')}</h2>
                <div className="mt-2 text-gray-800 whitespace-pre-wrap">{d.experience || t('common.notProvided')}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

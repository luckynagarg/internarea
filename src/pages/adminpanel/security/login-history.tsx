import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { API_URL } from '@/config/api';
import { getAuthHeaders } from '@/lib/authHeaders';
import { useT } from '@/i18n/runtime';

type Row = {
  id?: string;
  userName?: string;
  user?: string;
  email?: string;
  loginTime?: string;
  browser?: string;
  browserVersion?: string;
  deviceType?: string;
  operatingSystem?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  loginMethod?: string;
  status?: string;
  otpVerified?: boolean;
  failureReason?: string;
};

export default function AdminLoginHistoryPage() {
  const { t } = useT();
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const headers = await getAuthHeaders();
        const res = await axios.get(API_URL('/api/admin/login-history'), {
          headers,
          params: {
            page,
            pageSize,
            sortOrder: 'desc',
            search: search || undefined,
            status: status || undefined,
          },
        });

        if (!mounted) return;
        const data = res?.data?.data || [];
        const pagination = res?.data?.pagination;
        setRows(data);
        setTotalPages(pagination?.totalPages || 1);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || t('errors.generic'));
        setRows([]);

        // Redirect to admin login on auth failures.
        const status = e?.response?.status;
        if (status === 401 || status === 403) {
          router.push("/adminlogin");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [page, pageSize, search, status]);

  const exportCsv = async () => {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    params.set('page', String(page));

    window.location.href = API_URL(
      `/api/admin/login-history/export/csv?${params.toString()}`
    );
  };

  const exportExcel = async () => {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    params.set('page', String(page));

    window.location.href = API_URL(
      `/api/admin/login-history/export/excel?${params.toString()}`
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('admin.loginHistory.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">{t('admin.loginHistory.subtitle')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          {error ? <div className="p-3 mb-4 bg-red-50 text-red-700 rounded">{error}</div> : null}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('admin.loginHistory.searchPlaceholder')}
              className="border rounded-lg px-3 py-2 text-sm"
            />

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">{t('admin.loginHistory.allStatuses')}</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="BLOCKED">BLOCKED</option>
            </select>

            <button
              onClick={() => {
                setPage(1);
              }}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700"
            >
              {t('common.apply')}
            </button>

            <div className="flex gap-2">
              <button
                onClick={exportCsv}
                className="bg-gray-100 hover:bg-gray-200 rounded-lg px-4 py-2 text-sm border"
              >
                {t('common.exportCsv')}
              </button>
              <button
                onClick={exportExcel}
                className="bg-gray-100 hover:bg-gray-200 rounded-lg px-4 py-2 text-sm border"
              >
                {t('common.exportExcel')}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-gray-500">{t('admin.loginHistory.noRecords')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-3 pr-3">{t('admin.loginHistory.cols.user')}</th>
                    <th className="py-3 pr-3">{t('admin.loginHistory.cols.email')}</th>
                    <th className="py-3 pr-3">{t('admin.loginHistory.cols.loginTime')}</th>
                    <th className="py-3 pr-3">{t('admin.loginHistory.cols.browser')}</th>
                    <th className="py-3 pr-3">{t('admin.loginHistory.cols.browserVersion')}</th>
                    <th className="py-3 pr-3">{t('admin.loginHistory.cols.device')}</th>
                    <th className="py-3 pr-3">{t('admin.loginHistory.cols.os')}</th>
                    <th className="py-3 pr-3">{t('admin.loginHistory.cols.ip')}</th>
                    <th className="py-3 pr-3">{t('admin.loginHistory.cols.country')}</th>
                    <th className="py-3 pr-3">{t('admin.loginHistory.cols.city')}</th>
                    <th className="py-3 pr-3">{t('admin.loginHistory.cols.loginMethod')}</th>
                    <th className="py-3 pr-3">{t('admin.loginHistory.cols.otpVerified')}</th>
                    <th className="py-3 pr-3">{t('admin.loginHistory.cols.status')}</th>
                    <th className="py-3 pr-3">{t('admin.loginHistory.cols.failureReason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((x, idx) => (
                    <tr key={x.id || idx} className="border-b last:border-b-0">
                      <td className="py-3 pr-3">{x.userName || x.user || ''}</td>
                      <td className="py-3 pr-3">{x.email || ''}</td>
                      <td className="py-3 pr-3">{x.loginTime || ''}</td>
                      <td className="py-3 pr-3">{x.browser || ''}</td>
                      <td className="py-3 pr-3">{x.browserVersion || ''}</td>
                      <td className="py-3 pr-3">{x.deviceType || ''}</td>
                      <td className="py-3 pr-3">{x.operatingSystem || ''}</td>
                      <td className="py-3 pr-3">{x.ipAddress || ''}</td>
                      <td className="py-3 pr-3">{x.country || ''}</td>
                      <td className="py-3 pr-3">{x.city || ''}</td>
                      <td className="py-3 pr-3">{x.loginMethod || ''}</td>
                      <td className="py-3 pr-3">{x.otpVerified ? t('common.yes') : t('common.no')}</td>
                      <td className="py-3 pr-3">{x.status || ''}</td>
                      <td className="py-3 pr-3">{x.failureReason || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <button
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t('common.prev')}
            </button>
            <div className="text-sm text-gray-600">
              {t('common.pageOf', { values: { page: String(page), total: String(totalPages) } })}
            </div>
            <button
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

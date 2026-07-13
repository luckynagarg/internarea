import React, { useEffect, useMemo, useState } from 'react';
import { getAuthHeaders } from '@/lib/authHeaders';
import axios from 'axios';
import { API_URL } from '@/config/api';

type LoginStatus = string;

type LoginHistoryItem = {
  loginTime: string;
  logoutTime: Date | string | null;
  browser: string;
  browserVersion: string;
  operatingSystem: string;
  deviceType: string;
  deviceName: string;
  ipAddress: string;
  country: string;
  city: string;
  loginMethod: string;
  status: LoginStatus;
  failureReason: string;
  otpVerified: boolean;
  // backward compatible
  id?: string;
};

export default function UserLoginHistoryPage() {
  const [items, setItems] = useState<LoginHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string>('');

  const queryParams = useMemo(() => {
    return { page, pageSize, sortOrder: 'desc' };
  }, [page, pageSize]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const headers = await getAuthHeaders();
        if (!headers.Authorization) {
          throw new Error('Not authenticated');
        }

        const res = await axios.get(API_URL('/api/login/history'), {
          headers,
          params: queryParams,
        });

        if (!mounted) return;
        const data = res?.data?.data || [];
        const pagination = res?.data?.pagination;

        setItems(data);
        setTotalPages(pagination?.totalPages || 1);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load login history');
        setItems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [queryParams]);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Login History</h1>
          <p className="text-sm text-gray-500 mb-6">
            Review your recent login attempts.
          </p>

          {error ? <div className="p-3 mb-4 bg-red-50 text-red-700 rounded">{error}</div> : null}

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-gray-500">
              No login attempts found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-3 pr-3">Login Time</th>
                    <th className="py-3 pr-3">Browser</th>
                    <th className="py-3 pr-3">Browser Version</th>
                    <th className="py-3 pr-3">OS</th>
                    <th className="py-3 pr-3">Device</th>
                    <th className="py-3 pr-3">IP</th>
                    <th className="py-3 pr-3">Country</th>
                    <th className="py-3 pr-3">City</th>
                    <th className="py-3 pr-3">Login Method</th>
                    <th className="py-3 pr-3">OTP Verified</th>
                    <th className="py-3 pr-3">Status</th>
                    <th className="py-3 pr-3">Failure Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((x, idx) => (
                    <tr key={x.id || idx} className="border-b last:border-b-0">
                      <td className="py-3 pr-3">{x.loginTime}</td>
                      <td className="py-3 pr-3">{x.browser}</td>
                      <td className="py-3 pr-3">{x.browserVersion}</td>
                      <td className="py-3 pr-3">{x.operatingSystem}</td>
                      <td className="py-3 pr-3">{x.deviceType}{x.deviceName ? ` (${x.deviceName})` : ''}</td>
                      <td className="py-3 pr-3">{x.ipAddress}</td>
                      <td className="py-3 pr-3">{x.country}</td>
                      <td className="py-3 pr-3">{x.city}</td>
                      <td className="py-3 pr-3">{x.loginMethod}</td>
                      <td className="py-3 pr-3">{x.otpVerified ? 'Yes' : 'No'}</td>
                      <td className="py-3 pr-3">{x.status}</td>
                      <td className="py-3 pr-3">{x.failureReason}</td>
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
              Prev
            </button>

            <div className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </div>

            <button
              className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  Loader2,
  ArrowRight,
  FileText,
  CalendarDays,
  CreditCard,
  AlertTriangle,
  RefreshCcw,
  XCircle,
} from 'lucide-react';
import axiosClient from '@/lib/apiClient';
import { API_URL } from '@/config/api';
import { useT } from '@/i18n/runtime';

type PaymentRecord = {
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amount: number;
  currency: string;
  status: string;
  failureReason?: string | null;
  verifiedAt?: string | null;
  invoiceNumber?: string | null;
  planKey: string;
  createdAt: string;
};

type QuotaResponse = {
  planKey: string;
  planName: string;
  monthlyLimit: number;
  applicationsUsed: number;
  remainingApplications: number;
  subscriptionStatus: string;
  subscriptionStart: string;
  subscriptionExpiry: string;
};

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { order_id, payment_id, plan } = router.query;
  const { t } = useT();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [quota, setQuota] = useState<QuotaResponse | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    if (!order_id) {
      setLoading(false);
      setError(t('errors.generic'));
      return;
    }

    let mounted = true;
    async function load() {
      const results = await Promise.allSettled([
        axiosClient.get(`/api/subscription/payments/${order_id}`),
        axiosClient.get('/api/subscription/me'),
      ]);

      if (!mounted) return;

      const payRes = results[0].status === 'fulfilled' ? results[0].value : null;
      const quotaRes = results[1].status === 'fulfilled' ? results[1].value : null;

      if (!payRes && !quotaRes) {
        const msg = results[0].status === 'rejected'
          ? results[0].reason?.response?.data?.error?.message || results[0].reason?.message || t('errors.generic')
          : t('errors.generic');
        setError(msg);
        setLoading(false);
        return;
      }

      setPayment(payRes?.data?.data || null);
      setQuota(quotaRes?.data?.data || null);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [router.isReady, order_id]);

  const isVerified = payment?.status === 'verified';
  const isFailed = payment?.status === 'failed';
  const isPending = payment?.status === 'created';
  const isCancelled = payment?.status === 'cancelled';
  const statusLabel = isVerified ? t('status.verified') : isFailed ? t('status.failed') : isPending ? t('status.pending') : isCancelled ? t('status.cancelled') : payment?.status || t('common.nA');

  if (!loading && !error && !payment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10">
        <div className="max-w-2xl w-full mx-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-600 mx-auto" />
            <h2 className="text-lg font-semibold text-gray-900 mt-4">{t('subscription.paymentConfirmationPending')}</h2>
            <p className="text-gray-600 mt-2 text-sm">{t('payment.pendingDesc')}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <Link href="/subscription" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                {t('subscription.goToSubscription')}
              </Link>
              <Link href="/dashboard" className="px-5 py-2.5 border rounded-lg hover:bg-gray-50 text-sm font-medium">
                {t('common.backToDashboard')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10">
      <div className="max-w-2xl w-full mx-4">
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
            <h2 className="text-lg font-semibold text-gray-900 mt-4">{t('payment.verifyingPayment')}</h2>
            <p className="text-gray-600 mt-2 text-sm">{t('payment.verifyingDesc')}</p>
          </div>
        ) : isFailed ? (
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mt-4">{t('payment.failed')}</h2>
            <p className="text-gray-600 mt-2 text-sm">
              {payment?.failureReason || t('payment.failedDesc')}
            </p>
            <div className="mt-4 bg-gray-50 rounded-lg p-4 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('payment.orderId')}</span>
                <span className="font-mono text-gray-900">{payment?.razorpayOrderId}</span>
              </div>
              {payment?.razorpayPaymentId && (
                <div className="flex justify-between mt-2">
                  <span className="text-gray-500">{t('payment.paymentId')}</span>
                  <span className="font-mono text-gray-900">{payment.razorpayPaymentId}</span>
                </div>
              )}
              <div className="flex justify-between mt-2">
                <span className="text-gray-500">{t('subscription.plan')}</span>
                <span className="font-semibold text-gray-900">{plan ? String(plan).toUpperCase() : payment?.planKey?.toUpperCase() || '—'}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <Link href="/subscription" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                <RefreshCcw size={16} /> {t('payment.retryPayment')}
              </Link>
              <Link href="/dashboard" className="px-5 py-2.5 border rounded-lg hover:bg-gray-50 text-sm font-medium">
                {t('common.backToDashboard')}
              </Link>
            </div>
          </div>
        ) : isCancelled ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
              <XCircle className="h-6 w-6 text-gray-600" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mt-4">{t('payment.cancelled')}</h2>
            <p className="text-gray-600 mt-2 text-sm">{t('payment.cancelledDesc')}</p>
            <div className="mt-4 bg-gray-50 rounded-lg p-4 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('payment.orderId')}</span>
                <span className="font-mono text-gray-900">{payment?.razorpayOrderId}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-500">{t('subscription.plan')}</span>
                <span className="font-semibold text-gray-900">{plan ? String(plan).toUpperCase() : payment?.planKey?.toUpperCase() || '—'}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <Link href="/subscription" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                <RefreshCcw size={16} /> {t('payment.retryPayment')}
              </Link>
              <Link href="/dashboard" className="px-5 py-2.5 border rounded-lg hover:bg-gray-50 text-sm font-medium">
                {t('common.backToDashboard')}
              </Link>
            </div>
          </div>
        ) : isPending ? (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <Loader2 className="h-6 w-6 text-amber-600 animate-spin" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mt-4">{t('payment.pending')}</h2>
            <p className="text-gray-600 mt-2 text-sm">
              {t('payment.pendingDesc')}
            </p>
            <div className="mt-4 bg-gray-50 rounded-lg p-4 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('payment.orderId')}</span>
                <span className="font-mono text-gray-900">{payment?.razorpayOrderId}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-500">{t('subscription.plan')}</span>
                <span className="font-semibold text-gray-900">{plan ? String(plan).toUpperCase() : payment?.planKey?.toUpperCase() || '—'}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <button
                type="button"
                onClick={() => router.reload()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                {t('payment.refreshStatus')}
              </button>
              <Link href="/subscription" className="px-5 py-2.5 border rounded-lg hover:bg-gray-50 text-sm font-medium">
                {t('payment.backToSubscription')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
              <CheckCircle className="h-6 w-6 text-green-600" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mt-4">{t('payment.success')}</h2>
            <p className="text-gray-600 mt-2 text-sm">
              {t('payment.successDesc', { values: { plan: plan ? String(plan) : payment?.planKey || '' } })}
            </p>

            <div className="mt-6 bg-gray-50 rounded-lg p-5 text-left text-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2">
                  <CreditCard size={14} /> {t('payment.paymentId')}
                </span>
                <span className="font-mono text-gray-900">{payment?.razorpayPaymentId || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2">
                  <FileText size={14} /> {t('payment.orderId')}
                </span>
                <span className="font-mono text-gray-900">{payment?.razorpayOrderId || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{t('payment.amountPaid')}</span>
                <span className="font-semibold text-gray-900">₹{payment?.amount ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">{t('payment.status')}</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  {statusLabel}
                </span>
              </div>
              {quota && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2">
                      <CalendarDays size={14} /> {t('subscription.startDate')}
                    </span>
                    <span className="text-gray-900">{new Date(quota.subscriptionStart).toDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2">
                      <CalendarDays size={14} /> {t('subscription.renewalDate')}
                    </span>
                    <span className="text-gray-900">{new Date(quota.subscriptionExpiry).toDateString()}</span>
                  </div>
                </>
              )}
              {payment?.invoiceNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t('payment.invoice')}</span>
                  <a
                    href={API_URL(`/api/subscription/invoices/${encodeURIComponent(payment.invoiceNumber)}/download`)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 hover:text-blue-800 font-medium"
                  >
                    {payment.invoiceNumber}
                  </a>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <Link href="/subscription" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                {t('payment.manageSubscription')} <ArrowRight size={16} />
              </Link>
              <Link href="/dashboard" className="px-5 py-2.5 border rounded-lg hover:bg-gray-50 text-sm font-medium">
                {t('common.backToDashboard')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

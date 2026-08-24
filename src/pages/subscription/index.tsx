import React, { useEffect, useMemo, useState } from "react";
import { useT } from '@/i18n/runtime';
import axiosClient from "@/lib/apiClient";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { API_URL } from "@/config/api";
import { toast } from "react-toastify";
import {
  CalendarDays,
  Loader2,
  Lock,
  QrCode,
  RotateCcw,
  Shield,
  X,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

type PlanKey = "free" | "bronze" | "silver" | "gold";

type SubscriptionQuota = {
  planKey: PlanKey;
  planName: string;
  monthlyLimit: number;
  applicationsUsed: number;
  remainingApplications: number;
  subscriptionStatus: "active" | "expired";
  subscriptionStart: string;
  subscriptionExpiry: string;
};

type SubscriptionDashboardResponse = {
  success: boolean;
  data: SubscriptionQuota;
};

type PaymentTransaction = {
  _id: string;
  userId: string;
  planKey: string;
  amount: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
  status: string;
  failureReason?: string | null;
  verifiedAt?: string | null;
  invoiceNumber?: string | null;
  createdAt: string;
};

type Invoice = {
  _id: string;
  userId: string;
  invoiceNumber: string;
  planKey: string;
  amountPaid: number;
  currency: string;
  paymentId: string;
  subscriptionStart: string;
  subscriptionExpiry: string;
  emailStatus: string;
  createdAt: string;
};

type PlanOption = {
  key: PlanKey;
  label: string;
  price: string;
  amountINR: number;
};

const PLANS: PlanOption[] = [
  { key: "bronze", label: "Bronze", price: "₹100", amountINR: 100 },
  { key: "silver", label: "Silver", price: "₹300", amountINR: 300 },
  { key: "gold", label: "Gold", price: "₹1000", amountINR: 1000 },
];

function getDaysRemaining(expiry: string | Date | null | undefined) {
  if (!expiry) return 0;
  const end = new Date(expiry).getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)));
}

function badgeStyles(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "active") return "bg-green-100 text-green-800";
  if (s === "expired") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-800";
}

export default function SubscriptionPage() {
  const { t } = useT();
  const router = useRouter();
  const user = useSelector(selectuser);

  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<SubscriptionQuota | null>(null);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [qrData, setQrData] = useState<any>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const remaining = quota?.remainingApplications ?? 0;
  const used = quota?.applicationsUsed ?? 0;
  const limit = quota?.monthlyLimit ?? 0;
  const unlimited = limit === Number.POSITIVE_INFINITY;

  const progress = useMemo(() => {
    if (!quota) return 0;
    if (unlimited) return 100;
    if (!Number.isFinite(limit) || limit <= 0) return 0;
    return Math.max(0, Math.min(100, (used / limit) * 100));
  }, [quota, used, limit, unlimited]);

  const pendingPayments = useMemo(
    () => payments.filter((p) => p.status === "created"),
    [payments]
  );

  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  async function refreshAll() {
    setLoading(true);
    setError(null);
    try {
      const [quotaRes, payRes, invRes] = await Promise.all([
        axiosClient.get("/api/subscription/me"),
        axiosClient.get("/api/subscription/payments"),
        axiosClient.get("/api/subscription/invoices"),
      ]);

      const q: SubscriptionDashboardResponse = quotaRes.data;
      setQuota(q.data);
      setPayments(payRes.data.data || []);
      setInvoices(invRes.data.data || []);
    } catch (e: any) {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  async function handleUpgrade(planKey: PlanKey) {
    if (!user) {
      setError(t('common.pleaseLogin'));
      return;
    }
    setCheckoutLoading(planKey);
    setError(null);
    try {
      const { data } = await axiosClient.post("/api/subscription/razorpay/create-order", {
        planKey,
      });

      const { orderId, amount, currency, subscriptionName } = data.data;

      await openRazorpayCheckout({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        amount: amount * 100,
        currency,
        order_id: orderId,
        name: "InternArea",
        description: t('subscription.title'),
        prefill: {
          name: user?.name || user?.displayName || "",
          email: user?.email || "",
        },
        handler: async (response) => {
          try {
            await axiosClient.post("/api/subscription/razorpay/verify", {
              planKey,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            router.push({
              pathname: "/payment/success",
              query: {
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                plan: planKey,
              },
            });
          } catch (verifyErr: any) {
            const msg =
              verifyErr?.response?.data?.error?.message ||
              verifyErr?.response?.data?.message ||
              "Payment verification failed.";
            router.push({
              pathname: "/payment/failed",
              query: { order_id: response.razorpay_order_id, plan: planKey, reason: msg },
            });
          }
        },
        modal: {
          ondismiss: () => {
            if (!orderId) return;
            axiosClient
              .get(`/api/subscription/payments/${orderId}`)
              .then((res) => {
                const status = res?.data?.data?.status;
                if (status === "failed") {
                  router.push({
                    pathname: "/payment/failed",
                    query: { order_id: orderId, plan: planKey },
                  });
                } else {
                  router.push({
                    pathname: "/payment/cancel",
                    query: { order_id: orderId, plan: planKey },
                  });
                }
              })
              .catch(() => {
                router.push({
                  pathname: "/payment/cancel",
                  query: { order_id: orderId, plan: planKey },
                });
              });
          },
        },
      });
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || e?.response?.data?.message || "Failed to start checkout. Make sure payment is enabled.";
      setError(msg);
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handleShowQr(planKey: PlanKey) {
    if (!user) {
      setError(t('common.pleaseLogin'));
      return;
    }
    setQrLoading(true);
    setQrData(null);
    setError(null);
    try {
      const res = await axiosClient.post("/api/subscription/qr", { planKey });
      setQrData(res?.data?.data);
      toast.success(t('common.success'));
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || e?.response?.data?.message || "Failed to generate QR.";
      setError(msg);
    } finally {
      setQrLoading(false);
    }
  }

  const currentPlanKey = (quota?.planKey || "free") as PlanKey;
  const currentPlan = PLANS.find((p) => p.key === currentPlanKey);

  const ctaLabel = (plan: PlanOption) => {
    if (plan.key === currentPlanKey) return t('subscription.currentPlan');
    const order = { free: 0, bronze: 1, silver: 2, gold: 3 } as Record<PlanKey, number>;
    if (order[plan.key] > order[currentPlanKey]) return t('subscription.upgradeInfo');
    return t('subscription.upgradeInfo');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('subscription.title')}</h1>
            <p className="text-gray-600 mt-1">{t('subscription.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 text-sm text-gray-600">
              <Shield className="h-4 w-4" />
              {t('dashboard.backendLimits')}
            </span>
          </div>
        </div>

        {pendingPayments.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 mb-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5" />
            <div>
              <div className="text-sm font-semibold">{t('dashboard.pending')}</div>
              <div className="text-sm mt-1">
                {t('subscription.tip')}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-700">{t('subscription.loading')}</span>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-4">
            {error}
          </div>
        )}

        {!loading && !error && quota && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-5 lg:col-span-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">{t('subscription.currentPlan')}</div>
                    <div className="text-2xl font-bold text-gray-900">{quota.planName}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badgeStyles(quota.subscriptionStatus)}`}>
                        {t(`status.${quota.subscriptionStatus}`)}
                      </span>
                      <span className="text-sm text-gray-600">• {unlimited ? t('dashboard.unlimited') : `${quota.monthlyLimit} / ${t('subscription.monthlyLimit')}`}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-500">{t('subscription.daysRemaining')}</div>
                    <div className="text-2xl font-bold text-gray-900">{getDaysRemaining(quota.subscriptionExpiry)}</div>
                    <div className="text-sm text-gray-600">{t('subscription.until')} {new Date(quota.subscriptionExpiry).toDateString()}</div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>
                      {t('subscription.applications')}: <span className="font-semibold text-gray-900">{used}</span> {t('subscription.used')}
                    </span>
                    <span>
                      {t('subscription.remaining')}: <span className="font-semibold text-gray-900">{unlimited ? "∞" : remaining}</span>
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <CalendarDays className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-500">{t('subscription.startDate')}</div>
                      <div className="text-sm font-semibold text-gray-900">{new Date(quota.subscriptionStart).toDateString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <RotateCcw className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-500">{t('subscription.monthlyReset')}</div>
                      <div className="text-sm font-semibold text-gray-900">{t('subscription.resetInfo')}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {unlimited
                      ? t('dashboard.unlimited')
                      : t('subscription.upgradeInfo')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PLANS.map((p) => {
                      const isCurrent = p.key === currentPlanKey;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          disabled={checkoutLoading === p.key || isCurrent}
                          onClick={() => handleUpgrade(p.key)}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed ${
                            isCurrent
                              ? "bg-gray-100 text-gray-500 cursor-default"
                              : "bg-blue-600 text-white hover:bg-blue-700"
                          }`}
                        >
                          {checkoutLoading === p.key ? (
                            <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                          ) : null}
                          {checkoutLoading === p.key
                            ? t('subscription.loading')
                            : isCurrent
                            ? t('subscription.currentPlan')
                            : `${ctaLabel(p)} ${t(`subscription.planName.${p.key}`)} (${p.price})`}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => handleShowQr("gold")}
                      disabled={qrLoading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition disabled:opacity-60"
                    >
                      {qrLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <QrCode className="h-4 w-4" />
                      )}
                      {qrLoading ? t('common.generating') : t('common.payWithRazorpay')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="text-sm font-medium text-gray-500">{t('subscription.yourUsage')}</div>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('subscription.planPrice')}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {currentPlan ? currentPlan.price : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('subscription.applicationsUsed')}</span>
                    <span className="text-sm font-semibold text-gray-900">{used}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('subscription.applicationsRemaining')}</span>
                    <span className="text-sm font-semibold text-gray-900">{unlimited ? "∞" : remaining}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('subscription.monthlyLimit')}</span>
                    <span className="text-sm font-semibold text-gray-900">{unlimited ? t('dashboard.unlimited') : `${limit}`}</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 text-sm text-gray-600">
                  {t('subscription.tip')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">{t('subscription.paymentHistory')}</h2>
                  <Link
                    href="/subscription/history"
                    className="text-sm text-blue-700 hover:text-blue-800 font-medium"
                  >
                    {t('common.view')}
                  </Link>
                </div>
                <div className="space-y-3">
                  {payments.length === 0 && (
                    <div className="text-sm text-gray-500">{t('subscription.noPayments')}</div>
                  )}
                  {payments.slice(0, 10).map((p) => (
                    <div key={p._id} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{p.planKey.toUpperCase()}</div>
                          <div className="text-xs text-gray-500">{t('subscription.invoices')}: {p.razorpayOrderId}</div>
                          <div className="text-xs text-gray-500">{t('subscription.paymentHistory')}: {p.razorpayPaymentId || "—"}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">₹{p.amount}</div>
                          <div
                            className={`text-xs font-semibold mt-1 inline-flex px-2 py-1 rounded-full ${
                              p.status === "verified"
                                ? "bg-green-100 text-green-800"
                                : p.status === "failed"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {p.status}
                          </div>
                        </div>
                      </div>
                      {p.failureReason && <div className="text-xs text-red-600 mt-2">{p.failureReason}</div>}
                      {p.invoiceNumber && (
                        <div className="text-xs text-blue-600 mt-2">
                          {t('subscription.invoices')}:{" "}
                          <a
                            href={API_URL(`/api/subscription/invoices/${encodeURIComponent(p.invoiceNumber)}/download`)}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            {p.invoiceNumber}
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">{t('subscription.invoices')}</h2>
                </div>
                <div className="space-y-3">
                  {invoices.length === 0 && (
                    <div className="text-sm text-gray-500">{t('subscription.noInvoices')}</div>
                  )}
                  {invoices.slice(0, 10).map((inv) => (
                    <div key={inv._id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{inv.invoiceNumber}</div>
                        <div className="text-xs text-gray-500">{new Date(inv.createdAt).toDateString()}</div>
                        <div className="text-xs text-gray-600">{inv.emailStatus}</div>
                      </div>
                      <Link
                        href={API_URL(`/api/subscription/invoices/${encodeURIComponent(inv.invoiceNumber)}/download`)}
                        target="_blank"
                        className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition"
                      >
                        {t('subscription.downloadPdf')}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {!loading && !quota && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-sm text-gray-600">{t('subscription.dataUnavailable')}</div>
          </div>
        )}
      </div>

      {qrData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
            <button
              type="button"
              onClick={() => setQrData(null)}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('common.payWithRazorpay')}</h3>
            <p className="text-sm text-gray-600 mb-4">{t('subscription.tip')}</p>
            {qrData.qrUrl && (
              <img
                src={qrData.qrUrl}
                alt={t('common.view')}
                className="mx-auto w-64 h-64 object-contain border rounded-lg"
              />
            )}
            {qrData.upiId && (
              <div className="mt-3 text-center text-sm text-gray-500">
                {t('subscription.upiIdLabel')}: <span className="font-mono font-semibold text-gray-900">{qrData.upiId}</span>
              </div>
            )}
            <div className="mt-4 text-xs text-gray-500 text-center">
              {t('subscription.planPrice')}: ₹{qrData.amountPaise ? (qrData.amountPaise / 100).toFixed(2) : "—"} | {t('status.pending')}: {qrData.status}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

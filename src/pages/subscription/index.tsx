import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import { getAuthHeaders } from "@/lib/authHeaders";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { toast } from "react-toastify";
import {
  CalendarDays,
  Loader2,
  Lock,
  RotateCcw,
  Shield,
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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "https://internshala-clone-y2p2.onrender.com";

function formatINR(amount: number) {
  if (!Number.isFinite(amount)) return "∞";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
}

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
  const user = useSelector(selectuser);

  const [loading, setLoading] = useState(false);
const [quota, setQuota] = useState<SubscriptionQuota | null>(null);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  async function getHeaders() {
    const auth = await getAuthHeaders();
    return {
      "Content-Type": "application/json",
      ...auth,
    };
  }

  async function refreshAll() {
    setLoading(true);
    setError(null);
    try {
      const headers = await getHeaders();
      const [quotaRes, payRes, invRes] = await Promise.all([
        axios.get(`${API_BASE}/api/subscription/me`, { headers }),
        axios.get(`${API_BASE}/api/subscription/payments`, { headers }),
        axios.get(`${API_BASE}/api/subscription/invoices`, { headers }),
      ]);

      const q: SubscriptionDashboardResponse = quotaRes.data;
      setQuota(q.data);
      setPayments(payRes.data.data || []);
      setInvoices(invRes.data.data || []);
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || e.message || "Failed to load subscription data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpgrade(planKey: PlanKey) {
    if (!user) {
      setError("Please sign in to upgrade your plan.");
      return;
    }
    setCheckoutLoading(planKey);
    setError(null);
    try {
      const headers = await getHeaders();
      const { data } = await axios.post(
        `${API_BASE}/api/subscription/razorpay/create-order`,
        { planKey },
        { headers }
      );

      const { orderId, amount, currency, subscriptionName } = data.data;

      // Load the order and open Razorpay checkout.
      await openRazorpayCheckout({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        amount: amount * 100, // paise
        currency,
        order_id: orderId,
        name: "InternArea",
        description: `Subscription: ${subscriptionName}`,
        prefill: {
          name: user?.name || user?.displayName || "",
          email: user?.email || "",
        },
        handler: async (response) => {
          try {
            await axios.post(
              `${API_BASE}/api/subscription/razorpay/verify`,
              {
                planKey,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
              { headers }
            );
            toast.success("Payment successful! Your plan has been upgraded.");
            await refreshAll();
          } catch (verifyErr: any) {
            const msg = verifyErr?.response?.data?.error?.message || verifyErr?.response?.data?.message || "Payment verification failed.";
            setError(msg);
          }
        },
      });
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || e?.response?.data?.message || "Failed to start checkout. Make sure payment is enabled.";
      setError(msg);
    } finally {
      setCheckoutLoading(null);
    }
  }

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Subscription & Billing</h1>
            <p className="text-gray-600 mt-1">Manage your plan, payments, and invoices.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 text-sm text-gray-600">
              <Shield className="h-4 w-4" />
              Backend-enforced limits
            </span>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-700">Loading...</span>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-4">
            {error}
          </div>
        )}

        {!loading && !error && quota && (
          <>
            {/* Current plan */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-5 lg:col-span-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Current Plan</div>
                    <div className="text-2xl font-bold text-gray-900">{quota.planName}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badgeStyles(quota.subscriptionStatus)}`}>
                        {quota.subscriptionStatus}
                      </span>
                      <span className="text-sm text-gray-600">• {unlimited ? "Unlimited" : `${quota.monthlyLimit} / month`}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-500">Days remaining</div>
                    <div className="text-2xl font-bold text-gray-900">{getDaysRemaining(quota.subscriptionExpiry)}</div>
                    <div className="text-sm text-gray-600">until {new Date(quota.subscriptionExpiry).toDateString()}</div>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>
                      Applications: <span className="font-semibold text-gray-900">{used}</span> used
                    </span>
                    <span>
                      Remaining: <span className="font-semibold text-gray-900">{unlimited ? "∞" : remaining}</span>
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
                      <div className="text-xs text-gray-500">Start date</div>
                      <div className="text-sm font-semibold text-gray-900">{new Date(quota.subscriptionStart).toDateString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <RotateCcw className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="text-xs text-gray-500">Monthly reset</div>
                      <div className="text-sm font-semibold text-gray-900">1st of each IST month</div>
                    </div>
                  </div>
                </div>

                {/* Upgrade */}
                <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Upgrade to increase monthly applications.
                  </div>
                  <div className="flex gap-2">
                    {([
                      { key: "bronze", label: "Bronze", price: "₹100" },
                      { key: "silver", label: "Silver", price: "₹300" },
                      { key: "gold", label: "Gold", price: "₹1000" },
] as const).map((p) => (
                      <button
                        key={p.key}
                        type="button"
                        disabled={checkoutLoading === p.key}
                        onClick={() => handleUpgrade(p.key)}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {checkoutLoading === p.key ? (
                          <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                        ) : null}
                        {checkoutLoading === p.key ? "Starting..." : `Upgrade ${p.label} (${p.price})`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="text-sm font-medium text-gray-500">Your usage</div>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Plan price</span>
                    <span className="text-sm font-semibold text-gray-900">{unlimited ? "₹1000" : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Applications used</span>
                    <span className="text-sm font-semibold text-gray-900">{used}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Applications remaining</span>
                    <span className="text-sm font-semibold text-gray-900">{unlimited ? "∞" : remaining}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Monthly limit</span>
                    <span className="text-sm font-semibold text-gray-900">{unlimited ? "Unlimited" : `${limit}`}</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 text-sm text-gray-600">
                  Tip: Monthly limits are enforced on the backend when you submit an application.
                </div>
              </div>
            </div>

            {/* Payment history + invoices */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Payment History</h2>
                </div>
                <div className="space-y-3">
                  {payments.length === 0 && (
                    <div className="text-sm text-gray-500">No payments yet.</div>
                  )}
                  {payments.slice(0, 10).map((p) => (
                    <div key={p._id} className="border border-gray-100 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{p.planKey.toUpperCase()}</div>
                          <div className="text-xs text-gray-500">Order: {p.razorpayOrderId}</div>
                          <div className="text-xs text-gray-500">Payment: {p.razorpayPaymentId || "—"}</div>
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
                      {p.invoiceNumber && <div className="text-xs text-blue-600 mt-2">Invoice: {p.invoiceNumber}</div>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Invoices</h2>
                </div>
                <div className="space-y-3">
                  {invoices.length === 0 && (
                    <div className="text-sm text-gray-500">No invoices yet.</div>
                  )}
                  {invoices.slice(0, 10).map((inv) => (
                    <div key={inv._id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{inv.invoiceNumber}</div>
                        <div className="text-xs text-gray-500">{new Date(inv.createdAt).toDateString()}</div>
                        <div className="text-xs text-gray-600">{inv.emailStatus}</div>
                      </div>
                      <Link
                        href={`${API_BASE}/api/subscription/invoices/${inv.invoiceNumber}/download`}
                        target="_blank"
                        className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition"
                      >
                        Download PDF
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
            <div className="text-sm text-gray-600">Subscription data unavailable.</div>
          </div>
        )}
      </div>
    </div>
  );
}


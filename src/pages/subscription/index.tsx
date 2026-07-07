import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import {
  CalendarDays,
  Loader2,
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

type PaymentTransaction = {
  _id: string;
  planKey: string;
  amount: number;
  status: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  failureReason?: string | null;
  invoiceNumber?: string | null;
};

type Invoice = {
  _id: string;
  invoiceNumber: string;
  createdAt: string;
  emailStatus: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

function formatDate(date?: string) {
  if (!date) return "N/A";
  return new Date(date).toDateString();
}
// 50th line

function getDaysRemaining(expiry?: string) {
  if (!expiry) return 0;

  const diff = new Date(expiry).getTime() - Date.now();

  return Math.max(
    0,
    Math.ceil(diff / (1000 * 60 * 60 * 24))
  );
}

function badge(status: string) {
  if (status === "active")
    return "bg-green-100 text-green-700";

  if (status === "expired")
    return "bg-red-100 text-red-700";

  return "bg-gray-100 text-gray-700";
}

export default function SubscriptionPage() {
  const user = useSelector(selectuser);

  const [loading, setLoading] = useState(false);
  const [quota, setQuota] =
    useState<SubscriptionQuota | null>(null);

  const [payments, setPayments] =
    useState<PaymentTransaction[]>([]);

  const [invoices, setInvoices] =
    useState<Invoice[]>([]);

  const [error, setError] =
    useState<string | null>(null);

  const headers = useMemo(() => {
    const token = (user as any)?.token;

    return {
      "Content-Type": "application/json",
      Authorization: token
        ? `Bearer ${token}`
        : "",
    };
  }, [user]);

// 100th line

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const [q, p, i] = await Promise.all([
        axios.get(
          `${API_BASE}/api/subscription/me`,
          { headers }
        ),
        axios.get(
          `${API_BASE}/api/subscription/payments`,
          { headers }
        ),
        axios.get(
          `${API_BASE}/api/subscription/invoices`,
          { headers }
        ),
      ]);







      setQuota(q.data?.data || null);
      setPayments(p.data?.data || []);
      setInvoices(i.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const used = quota?.applicationsUsed || 0;
  const limit = quota?.monthlyLimit || 0;
  const remaining = quota?.remainingApplications || 0;

  const unlimited =
    !Number.isFinite(limit) || limit <= 0 || limit === Infinity;


// 150th line

  const progress = useMemo(() => {
    if (unlimited) return 0;
    if (!limit) return 0;
    return Math.min(100, (used / limit) * 100);
  }, [used, limit, unlimited]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Subscription & Billing</h1>
          <p className="text-gray-600">Manage your plan and payments</p>
        </div>

        {loading && (
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin" />
            Loading...
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded">
            {error}
          </div>
        )}

        {/* MAIN */}
        {!loading && quota && (
          <div className="grid md:grid-cols-3 gap-4">

            {/* PLAN CARD */}
            <div className="md:col-span-2 bg-white p-5 rounded shadow">
              <div className="flex justify-between">
                <div>
                  <h2 className="text-xl font-bold">{quota.planName}</h2>
                  <span className={`px-2 py-1 text-xs rounded ${badge(quota.subscriptionStatus)}`}>
                    {quota.subscriptionStatus}
                  </span>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-500">Days left</p>
                  <p className="text-xl font-bold">
                    {getDaysRemaining(quota.subscriptionExpiry)}
                  </p>
                </div>
              </div>
{/* 202th line */}
              {/* USAGE */}
              <div className="mt-4">
                <div className="flex justify-between text-sm">
                  <span>Used: {used}</span>
                  <span>Remaining: {unlimited ? "∞" : remaining}</span>
                </div>

                {!unlimited && (
                  <div className="w-full bg-gray-200 h-2 rounded mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* DATES */}
              <div className="mt-4 flex gap-4 text-sm text-gray-600">
                <div>
                  <CalendarDays className="inline w-4 h-4" />{" "}
                  {formatDate(quota.subscriptionStart)}
                </div>
                <div>
                  <RotateCcw className="inline w-4 h-4" /> Monthly reset
                </div>
              </div>

              {/* UPGRADE */}
              <div className="mt-5 flex gap-2">
                {["bronze", "silver", "gold"].map((p) => (
                  <button
                    key={p}
                    className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
                    onClick={() => {
                      console.log("Upgrade:", p);
                    }}
                  >
                    Upgrade {p}
                  </button>
                ))}
              </div>
            </div>
{/* 246th line */}
            {/* SIDE */}
            <div className="bg-white p-5 rounded shadow">
              <h3 className="font-bold mb-3">Usage</h3>

              <p>Plan: {quota.planKey}</p>
              <p>Limit: {unlimited ? "Unlimited" : limit}</p>
              <p>Used: {used}</p>
              <p>Remaining: {unlimited ? "∞" : remaining}</p>

              <div className="mt-3 text-sm text-gray-500">
                <Shield className="inline w-4 h-4" /> Backend enforced limits
              </div>
            </div>
          </div>
        )}

        {/* PAYMENTS */}
        {!loading && payments.length > 0 && (
          <div className="mt-6 bg-white p-5 rounded shadow">
            <h2 className="font-bold mb-3">Payments</h2>

            {payments.map((p) => (
              <div key={p._id} className="border p-3 rounded mb-2">
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">{p.planKey}</p>
                    <p className="text-xs text-gray-500">
                      Order: {p.razorpayOrderId}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>₹{p.amount}</p>
                    <span className="text-xs">{p.status}</span>
                  </div>
                </div>
{/* 282th line  */}
                {p.failureReason && (
                  <p className="text-red-500 text-xs">{p.failureReason}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* INVOICES */}
        {!loading && invoices.length > 0 && (
          <div className="mt-6 bg-white p-5 rounded shadow">
            <h2 className="font-bold mb-3">Invoices</h2>

            {invoices.map((inv) => (
              <div
                key={inv._id}
                className="flex justify-between border p-2 rounded mb-2"
              >
                <div>
                  <p>{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-500">
                    {formatDate(inv.createdAt)}
                  </p>
                </div>

                <Link
                  href={`${API_BASE}/api/subscription/invoices/${inv.invoiceNumber}/download`}
                  className="text-blue-600 text-sm"
                >
                  Download
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
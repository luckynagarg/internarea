import { useEffect, useState } from "react";
import Link from "next/link";
import axiosClient from "@/lib/apiClient";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import { ArrowLeft, Loader2 } from "lucide-react";

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

export default function SubscriptionHistoryPage() {
  const user = useSelector(selectuser);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PaymentTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await axiosClient.get("/api/subscription/payments");
        const data = res?.data?.data || [];
        if (mounted) setItems(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!mounted) return;
        const msg = e?.response?.data?.error?.message || "Failed to load payment history.";
        setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/subscription"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-700"
          >
            <ArrowLeft size={16} /> Back to Subscription
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900">Payment History</h1>
          <p className="text-gray-600 mt-1">All subscription payment transactions for your account.</p>

          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-700">Loading...</span>
            </div>
          )}

          {!loading && error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mt-4">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="mt-4 space-y-3">
              {items.length === 0 && (
                <div className="text-sm text-gray-500">No payment history yet.</div>
              )}
              {items.map((p) => (
                <div key={p._id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{p.planKey.toUpperCase()}</div>
                      <div className="text-xs text-gray-500 mt-1">Order: {p.razorpayOrderId}</div>
                      <div className="text-xs text-gray-500">Payment: {p.razorpayPaymentId || "—"}</div>
                      {p.failureReason && (
                        <div className="text-xs text-red-600 mt-1">{p.failureReason}</div>
                      )}
                    </div>
                    <div className="sm:text-right">
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
                      {p.invoiceNumber && (
                        <div className="text-xs text-blue-600 mt-1">
                          Invoice: {p.invoiceNumber}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(p.createdAt).toDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

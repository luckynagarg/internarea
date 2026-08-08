import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';
import axiosClient from '@/lib/apiClient';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const { order_id, payment_id, plan } = router.query;

  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (!router.isReady) return;
    if (!order_id || !payment_id) {
      setVerifying(false);
      setError('Missing payment details. Please check your email for confirmation.');
      return;
    }
// Verify payment status on the backend
    const verify = async () => {
      try {
        const res = await axiosClient.get(`/api/subscriptions/payments/${order_id}`);
        setResult(res?.data?.data);
        setVerifying(false);
      } catch (e: any) {
        setError(e?.response?.data?.error?.message || 'Could not verify payment.');
        setVerifying(false);
      }
    };
    verify();
  }, [router.isReady, order_id, payment_id]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10">
      <div className="max-w-lg w-full mx-4 bg-white rounded-2xl shadow-lg p-8 text-center">
        {verifying ? (
          <div>
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-900 mt-4">Verifying Payment...</h2>
            <p className="text-gray-600 mt-2">Please wait while we confirm your payment.</p>
          </div>
        ) : error ? (
          <div>
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900">Payment Confirmation Pending</h2>
            <p className="text-gray-600 mt-2">{error}</p>
            <div className="flex flex-col gap-3 mt-6">
              <Link href="/subscription" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Go to Subscription
              </Link>
              <Link href="/dashboard" className="px-6 py-3 border rounded-lg hover:bg-gray-50">
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-5xl mb-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Payment Successful!</h2>
            <p className="text-gray-600 mt-2">
              Your {plan || 'plan'} subscription has been activated. You can now access all premium features.
            </p>
            {result && (
              <div className="mt-4 bg-gray-50 rounded-lg p-4 text-left text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order ID</span>
                  <span className="font-mono text-gray-900">{result.razorpayOrderId}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-gray-500">Payment ID</span>
                  <span className="font-mono text-gray-900">{result.razorpayPaymentId}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-semibold text-gray-900">₹{result.amount}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-gray-500">Status</span>
                  <span className="font-semibold text-green-700">{result.status}</span>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-3 mt-6">
              <Link href="/subscription" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Manage Subscription <ArrowRight size={16} />
              </Link>
              <Link href="/dashboard" className="px-6 py-3 border rounded-lg hover:bg-gray-50">
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

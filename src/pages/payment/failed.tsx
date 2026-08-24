import { useRouter } from 'next/router';
import Link from 'next/link';
import { XCircle, RefreshCcw, ArrowRight, AlertTriangle } from 'lucide-react';
import { useT } from '@/i18n/runtime';

export default function PaymentFailedPage() {
  const router = useRouter();
  const { order_id, plan, reason } = router.query;
  const { t } = useT();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10">
      <div className="max-w-lg w-full mx-4 bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <XCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mt-4">{t('payment.failed')}</h2>
        <p className="text-gray-600 mt-2 text-sm">
          {typeof reason === 'string' && reason.trim()
            ? reason
            : t('payment.failedDesc')}
        </p>

        <div className="mt-4 bg-gray-50 rounded-lg p-4 text-left text-sm">
          {order_id && (
            <div className="flex justify-between">
              <span className="text-gray-500">{t('payment.orderId')}</span>
              <span className="font-mono text-gray-900">{String(order_id)}</span>
            </div>
          )}
          {plan && (
            <div className="flex justify-between mt-2">
              <span className="text-gray-500">{t('subscription.plan')}</span>
              <span className="font-semibold text-gray-900">{String(plan).toUpperCase()}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Link
            href="/subscription"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <RefreshCcw size={16} /> {t('payment.retryPayment')}
          </Link>
          <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border rounded-lg hover:bg-gray-50 text-sm font-medium">
            {t('common.backToDashboard')} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

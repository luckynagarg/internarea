import { useRouter } from 'next/router';
import Link from 'next/link';
import { XCircle, RotateCcw, ArrowRight } from 'lucide-react';
import { useT } from '@/i18n/runtime';

export default function PaymentCancelPage() {
  const router = useRouter();
  const { order_id, plan } = router.query;
  const { t } = useT();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10">
      <div className="max-w-lg w-full mx-4 bg-white rounded-2xl shadow-lg p-8 text-center">
        <XCircle className="h-12 w-12 text-red-600 mx-auto" />
        <h2 className="text-xl font-semibold text-gray-900 mt-4">{t('payment.cancelled')}</h2>
        <p className="text-gray-600 mt-2">
          {t('payment.cancelledDesc', { values: { plan: plan || '' } })}
        </p>
        {order_id && (
          <div className="mt-4 bg-gray-50 rounded-lg p-3 text-sm">
            <span className="text-gray-500">{t('payment.orderId')}: </span>
            <span className="font-mono text-gray-900">{order_id}</span>
          </div>
        )}
        <div className="flex flex-col gap-3 mt-6">
          <Link href="/subscription" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <RotateCcw size={16} /> {t('payment.retryPayment')}
          </Link>
          <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 px-6 py-3 border rounded-lg hover:bg-gray-50">
            {t('common.backToDashboard')} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

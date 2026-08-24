import Link from 'next/link';
import { useT } from '@/i18n/runtime';

export default function TermsPage() {
  const { t } = useT();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('terms.title')}</h1>
        <div className="space-y-5 text-gray-700 leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('terms.acceptanceTitle')}</h2>
            <p>{t('terms.acceptanceBody')}</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('terms.accountTitle')}</h2>
            <p>{t('terms.accountBody')}</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('terms.subscriptionsTitle')}</h2>
            <p>{t('terms.subscriptionsBody')}</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('terms.acceptableTitle')}</h2>
            <p>{t('terms.acceptableBody')}</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('terms.contactTitle')}</h2>
            <p>
              {t('terms.contactBody')}
              <Link href="/contact" className="text-blue-600">{t('terms.contactPage')}</Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

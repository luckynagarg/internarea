import Link from 'next/link';
import { useT } from '@/i18n/runtime';

export default function PrivacyPage() {
  const { t } = useT();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('privacy.title')}</h1>
        <div className="space-y-5 text-gray-700 leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('privacy.infoCollectTitle')}</h2>
            <p>{t('privacy.infoCollectBody')}</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('privacy.infoUseTitle')}</h2>
            <p>{t('privacy.infoUseBody')}</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('privacy.paymentsTitle')}</h2>
            <p>{t('privacy.paymentsBody')}</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('privacy.dataSecurityTitle')}</h2>
            <p>{t('privacy.dataSecurityBody')}</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('privacy.contactTitle')}</h2>
            <p>
              {t('privacy.contactBody')}
              <Link href="/contact" className="text-blue-600">{t('privacy.contactPage')}</Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

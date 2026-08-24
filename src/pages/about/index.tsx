import Link from 'next/link';
import { useT } from '@/i18n/runtime';

export default function AboutPage() {
  const { t } = useT();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('about.title')}</h1>
        <p className="text-gray-700 leading-relaxed mb-6">
          {t('about.body1')}
        </p>
        <p className="text-gray-700 leading-relaxed mb-6">
          {t('about.body2')}
        </p>
        <p className="text-gray-700 leading-relaxed mb-8">
          {t('about.body3')}
        </p>
        <div className="flex gap-4">
          <Link href="/internship" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            {t('about.exploreInternships')}
          </Link>
          <Link href="/contact" className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-100">
            {t('about.contactUs')}
          </Link>
        </div>
      </div>
    </div>
  );
}

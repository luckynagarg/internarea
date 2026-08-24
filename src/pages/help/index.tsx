import Link from 'next/link';
import { useT } from '@/i18n/runtime';

export default function HelpPage() {
  const { t } = useT();

  const helpItems = [
    { title: t('help.q1.title'), body: t('help.q1.body') },
    { title: t('help.q2.title'), body: t('help.q2.body') },
    { title: t('help.q3.title'), body: t('help.q3.body') },
    { title: t('help.q4.title'), body: t('help.q4.body') },
    { title: t('help.q5.title'), body: t('help.q5.body') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('help.title')}</h1>
        <div className="space-y-4">
          {helpItems.map((item, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/contact" className="text-blue-600 hover:text-blue-700">
            {t('help.contactUs')}
          </Link>
        </div>
      </div>
    </div>
  );
}

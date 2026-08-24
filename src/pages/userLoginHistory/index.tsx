import React from 'react';
import LoginHistory from '@/Components/LoginHistory';
import { useT } from '@/i18n/runtime';

export default function UserLoginHistoryPage() {
  const { t } = useT();

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('loginHistory.title')}</h1>
          <p className="text-sm text-gray-500 mb-6">
            {t('loginHistory.desc')}
          </p>
          <LoginHistory />
        </div>
      </div>
    </div>
  );
}

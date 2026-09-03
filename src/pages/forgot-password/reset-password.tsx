import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import axiosClient from '@/lib/axiosClient';
import { useT } from '@/i18n/runtime';

function generateLetterOnlyPassword(length = 12) {
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const arr = new Array(length);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint32Array(length);
    window.crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      arr[i] = letters[bytes[i] % letters.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      arr[i] = letters[Math.floor(Math.random() * letters.length)];
    }
  }
  return arr.join('');
}

function passwordStrength(pw: string) {
  const len = pw.length;
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);

  let score = 0;
  if (len >= 8) score += 1;
  if (len >= 12) score += 1;
  if (len >= 16) score += 1;
  if (hasLower && hasUpper) score += 1;

  const label = score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';
  const color = score <= 1 ? 'bg-red-100 text-red-700' : score === 2 ? 'bg-amber-100 text-amber-700' : score === 3 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';

  return { score, label, color };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const { method, identifier } = router.query as { method?: 'email' | 'phone'; identifier?: string };
  const { t } = useT();

  const [mode, setMode] = useState<'manual' | 'generated'>('manual');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  const strength = useMemo(() => passwordStrength(password), [password]);

  const [candidate, setCandidate] = useState<string>('');
  const [acceptedCandidate, setAcceptedCandidate] = useState(false);

  const createCandidate = () => {
    const pw = generateLetterOnlyPassword(12);
    setCandidate(pw);
    setAcceptedCandidate(false);
  };

  const acceptCandidate = () => {
    if (!candidate) return;
    setPassword(candidate);
    setAcceptedCandidate(true);
    setMessage('');
  };

  const submit = async () => {
    setMessage('');
    if (!method || !identifier) return;

    if (!password || password.length < 6) {
      setMessage(t('forgotPassword.resetPassword.passwordMin'));
      return;
    }
    if (password !== confirmPassword) {
      setMessage(t('forgotPassword.resetPassword.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await axiosClient.post(`/api/password-recovery/reset-password`, {
        method,
        identifier,
        otp: '000000',
        newPassword: password,
      });

      router.push({ pathname: '/forgot-password/success', query: { method, identifier } });
    } catch (e: any) {
      setMessage(e?.response?.data?.error?.message || t('forgotPassword.resetPassword.failed'));
    } finally {
      setLoading(false);
    }
  };

  const strengthLabel =
    strength.label === 'Weak'
      ? t('forgotPassword.resetPassword.strength.weak')
      : strength.label === 'Fair'
        ? t('forgotPassword.resetPassword.strength.fair')
        : strength.label === 'Good'
          ? t('forgotPassword.resetPassword.strength.good')
          : t('forgotPassword.resetPassword.strength.strong');

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900">{t('forgotPassword.resetPassword.title')}</h1>
          <p className="text-gray-600 mt-2 text-sm">{t('forgotPassword.resetPassword.createNew')}</p>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700">{t('forgotPassword.resetPassword.chooseOption')}</label>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                className={`px-4 py-2 rounded-lg border ${mode === 'manual' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
                onClick={() => setMode('manual')}
              >
                {t('forgotPassword.resetPassword.manual')}
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-lg border ${mode === 'generated' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}
                onClick={() => {
                  setMode('generated');
                  if (!candidate) createCandidate();
                }}
              >
                {t('forgotPassword.resetPassword.generator')}
              </button>
            </div>
          </div>

          {mode === 'generated' ? (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">{t('forgotPassword.resetPassword.generatedPassword')}</label>
                <button
                  type="button"
                  onClick={() => {
                    createCandidate();
                    setAcceptedCandidate(false);
                  }}
                  className="text-sm text-blue-700 hover:underline"
                >
                  {t('forgotPassword.resetPassword.regenerate')}
                </button>
              </div>

              {candidate ? (
                <div className="mt-3 border border-gray-200 rounded-xl p-3 bg-gray-50">
                  <div className="font-mono text-sm break-all">{candidate}</div>
                  <button
                    type="button"
                    onClick={acceptCandidate}
                    disabled={acceptedCandidate}
                    className="mt-3 w-full bg-blue-600 text-white font-semibold py-2 rounded-xl hover:bg-blue-700 disabled:opacity-60"
                  >
                    {acceptedCandidate ? t('forgotPassword.resetPassword.selected') : t('forgotPassword.resetPassword.useThis')}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700">{t('forgotPassword.resetPassword.passwordLabel')}</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setAcceptedCandidate(false);
                }}
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t('forgotPassword.resetPassword.placeholderNew')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50"
              >
                {showPassword ? t('forgotPassword.resetPassword.hide') : t('forgotPassword.resetPassword.show')}
              </button>
            </div>

            <div className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${strength.color}`}>
              {strengthLabel}
            </div>
          </div>

          <div className="mt-5">
            <label className="block text-sm font-medium text-gray-700">{t('forgotPassword.resetPassword.confirmLabel')}</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-2 w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('forgotPassword.resetPassword.placeholderConfirm')}
            />
          </div>

          {message ? <div className="mt-4 text-sm text-red-600">{message}</div> : null}

          <button
            type="button"
            disabled={loading}
            onClick={submit}
            className="mt-6 w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? t('forgotPassword.resetPassword.updating') : t('forgotPassword.resetPassword.update')}
          </button>
        </div>
      </div>
    </div>
  );
}

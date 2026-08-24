import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { useT } from '@/i18n/runtime';

export default function VerifyOtpPage() {
  const router = useRouter();
  const { method, identifier } = router.query as {
    method?: 'email' | 'phone';
    identifier?: string;
  };

  const { t } = useT();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  const [countDown, setCountDown] = useState<number>(300);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountDown((s) => Math.max(0, s - 1));
      setResendCooldown((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const verify = async () => {
    if (!method || !identifier) return;

    setLoading(true);
    setMessage('');
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL || ''}/api/password-recovery/verify-otp`, {
        method,
        identifier,
        otp,
      });

      router.push({
        pathname: '/forgot-password/reset-password',
        query: { method, identifier },
      });
    } catch (e: any) {
      setMessage(e?.response?.data?.error?.message || t('forgotPassword.verifyOtp.failed'));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!method || !identifier) return;
    if (resendCooldown > 0) return;

    setLoading(true);
    setMessage('');
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL || ''}/api/password-recovery/resend-otp`, {
        method,
        identifier,
      });

      setCountDown(300);
      setResendCooldown(60);
      setMessage(t('forgotPassword.verifyOtp.sentMessage'));
    } catch (e: any) {
      setMessage(e?.response?.data?.error?.message || t('forgotPassword.verifyOtp.failed'));
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900">{t('forgotPassword.verifyOtp.title')}</h1>
          <p className="text-gray-600 mt-2 text-sm">
            {method === 'phone' ? t('forgotPassword.verifyOtp.enterOtpPhone') : t('forgotPassword.verifyOtp.enterOtpEmail')}
          </p>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700">{t('forgotPassword.verifyOtp.otpLabel')}</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              placeholder={t('forgotPassword.verifyOtp.placeholder')}
              className="mt-2 w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-widest text-center text-lg"
            />
          </div>

          <div className="mt-4 text-sm text-gray-600">
            {t('forgotPassword.verifyOtp.expiresIn', { values: { time: formatTime(countDown) } })}
          </div>

          <div className="mt-3">
            <button
              type="button"
              disabled={loading || resendCooldown > 0}
              onClick={resend}
              className="w-full bg-white border border-gray-200 text-gray-800 font-semibold py-2.5 rounded-xl hover:bg-gray-50 disabled:opacity-60"
            >
              {resendCooldown > 0 ? t('forgotPassword.verifyOtp.resendIn', { values: { count: resendCooldown } }) : t('forgotPassword.verifyOtp.resend')}
            </button>
          </div>

          {message ? <div className="mt-4 text-sm text-red-600">{message}</div> : null}

          <button
            disabled={loading || otp.length !== 6}
            onClick={verify}
            className="mt-6 w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? t('forgotPassword.verifyOtp.verifying') : t('forgotPassword.verifyOtp.verify')}
          </button>
        </div>
      </div>
    </div>
  );
}

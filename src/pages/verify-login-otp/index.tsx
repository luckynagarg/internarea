'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { toast } from "react-toastify";
import { MailCheck, ShieldCheck } from "lucide-react";
import {
  verifyLoginOtp,
  resendLoginOtp,
} from "@/Feature/loginSecurity";
import { useT } from "@/i18n/runtime";

/**
 * Dedicated Gmail/Email OTP verification page shown after Google
 * (or email/password) sign-in when the server requires an email OTP.
 * NOTE: This is EMAIL OTP verification (code is sent to the user's Gmail),
 * NOT phone verification.
 */
export default function VerifyLoginOtpPage() {
  const router = useRouter();
  const { t } = useT();

  const [email, setEmail] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Require an authenticated Firebase user; capture their email.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setEmail(user.email ?? null);
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isVerifying) return;
    if (!otp.trim()) {
      toast.error(t('auth.otp.otpRequired'));
      return;
    }
    setIsVerifying(true);
    try {
      const res = await verifyLoginOtp(otp.trim());
            if (res.accessGranted) {
        toast.success(t('auth.otp.verifiedSuccess'));
        router.push("/dashboard");
      } else {
        toast.error(res.message || t('auth.otp.invalidOtp'));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? t('auth.otp.invalidOtp'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (isResending || cooldown > 0) return;
    setIsResending(true);
    try {
      await resendLoginOtp();
      toast.success(t('auth.otpResent'));
      setCooldown(60);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.message ?? t('auth.otp.resendOtpFailed'));
    } finally {
      setIsResending(false);
    }
  };

  const handleCancel = async () => {
    await auth.signOut().catch(() => {});
    router.push("/login");
  };

  // Mask email for display: ab***@gmail.com
  const maskedEmail = email
    ? email.replace(/^(.).*(@.*)$/, (_m, a, b) => `${a}***${b}`)
    : t('auth.emailVerification.yourEmail');

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Cooldown timer for resend.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <MailCheck className="mx-auto text-blue-600 mb-3" size={40} />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('auth.loginEmailOtp.title')}
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('auth.loginEmailOtp.subtitle')}{" "}
              <strong className="text-gray-900 dark:text-gray-200">{maskedEmail}</strong>
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
              <ShieldCheck size={14} />
              {t('auth.loginEmailOtp.securityNote')}
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="login-otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.loginEmailOtp.otpLabel')}
              </label>
              <input
                id="login-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder={t('auth.otp.otpPlaceholder')}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-center text-lg tracking-[0.4em]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
            >
              {isVerifying ? t('auth.otp.loading') : t('auth.otp.verifyOtp')}
            </button>
          </form>

          <button
            type="button"
            disabled={isResending || cooldown > 0}
            onClick={handleResend}
            className="w-full text-center text-xs text-blue-600 hover:underline mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cooldown > 0
              ? t('auth.otp.resendOtpIn', { values: { count: cooldown } })
              : t('auth.otp.resendOtp')}
          </button>

          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6 text-center">
            <button
              type="button"
              onClick={handleCancel}
              className="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline"
            >
              {t('auth.forgotPassword.backToLogin')}
            </button>
            <div className="mt-3">
              <Link href="/" className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                {t('auth.backToHome')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

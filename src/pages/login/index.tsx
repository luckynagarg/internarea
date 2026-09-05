'use client';

import React, { useState, useEffect, useCallback } from "react";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { auth, googleProvider } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import {
  startLoginGate,
} from "@/Feature/loginSecurity";
import { Eye, EyeOff } from "lucide-react";
import { useT } from "@/i18n/runtime";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useT();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // After a successful Firebase sign-in, run the server-side login gate
  // (Chrome OTP + mobile time restriction). If OTP is required, block access.
  const runLoginGate = useCallback(
    async (method: "google" | "password" | "phone") => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[Auth Debug] runLoginGate start', {
          method,
          firebaseUid: auth.currentUser?.uid ?? null,
          email: auth.currentUser?.email ?? null,
        });
      }
      let result;
      try {
        result = await startLoginGate(method);
      } catch (e: any) {
        const msg =
          e?.response?.data?.message ??
          e?.response?.data?.error ??
          e?.message ??
          t('auth.firebaseErrors.loginRestricted');
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[Auth Debug] runLoginGate FAILED', {
            method,
            status: e?.response?.status ?? null,
            data: e?.response?.data ?? null,
            message: msg,
          });
        }
        await auth.signOut().catch(() => {});
        setLoginError(msg);
        toast.error(msg);
        return;
      }
      if (result.otpRequired) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[Auth Debug] runLoginGate OTP required → /verify-login-otp', { method });
        }
        // Redirect to the dedicated Gmail/email OTP verification page
        // (email OTP, not phone verification).
        router.push("/verify-login-otp");
        return;
      }
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[Auth Debug] runLoginGate SUCCESS → redirecting to /dashboard', { method });
      }
      toast.success(t('auth.firebaseErrors.loggedInSuccessfully'));
      router.push("/dashboard");
    },
    [router, t]
  );

  async function ensureAuthUser(timeout = 2000): Promise<any> {
    if (auth.currentUser) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[Auth Debug] ensureAuthUser: already have user', { uid: auth.currentUser.uid });
      }
      return auth.currentUser;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug('[Auth Debug] ensureAuthUser: waiting for onAuthStateChanged...');
    }

    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          if (process.env.NODE_ENV !== 'production') {
            console.debug('[Auth Debug] ensureAuthUser: user confirmed', { uid: user.uid });
          }
          unsubscribe();
          resolve(user);
        }
      });
      setTimeout(() => {
        unsubscribe();
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[Auth Debug] ensureAuthUser: timeout, currentUser =', auth.currentUser?.uid ?? null);
        }
        resolve(auth.currentUser);
      }, timeout);
    });
  }

  // Pre-fill email from localStorage if "Remember Me" was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem("internarea_remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleGoogle = useCallback(async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      await ensureAuthUser();
      await runLoginGate("google");
    } catch (e: any) {
      if (e?.code === "auth/cancelled-popup-request") return;
      const msg = e?.message ?? t('auth.firebaseErrors.googleLoginFailed');
      setLoginError(msg);
      toast.error(msg);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [isGoogleLoading, runLoginGate, t]);

  const handleEmailLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!email.trim()) {
      setLoginError(t('auth.emailRequired'));
      return;
    }
    if (!password) {
      setLoginError(t('auth.passwordRequired'));
      return;
    }

    setIsEmailLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);

      if (rememberMe) {
        localStorage.setItem("internarea_remembered_email", email.trim());
      } else {
        localStorage.removeItem("internarea_remembered_email");
      }

      await ensureAuthUser();
      await runLoginGate("password");
    } catch (e: any) {
      const msg = e?.message ?? t('auth.firebaseErrors.emailLoginFailed');
      setLoginError(msg);
      toast.error(msg);
    } finally {
      setIsEmailLoading(false);
    }
  }, [email, password, rememberMe, runLoginGate, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.welcomeBack')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {t('auth.signInToAccount')}
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {loginError}
            </div>
          )}

          {/* Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isGoogleLoading ? t('auth.signingInGoogle') : t('auth.continueWithGoogle')}
            </span>
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">{t('common.or')}</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {t('auth.rememberMe')}
              </label>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end -mt-2">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline transition-colors"
              >
                {t('auth.forgotPasswordLink')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={isEmailLoading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
            >
              {isEmailLoading ? t('auth.signingIn') : t('auth.welcomeBack')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('auth.dontHaveAccount')}{" "}
              <Link href="/signup" className="text-blue-600 hover:text-blue-500 font-medium hover:underline">
                {t('auth.createAccount')}
              </Link>
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-300">
              {t('auth.backToHome')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

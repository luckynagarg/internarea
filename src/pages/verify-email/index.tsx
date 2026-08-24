'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import {
  sendEmailVerification,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { toast } from "react-toastify";
import { useT } from "@/i18n/runtime";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { t } = useT();
  const { email } = router.query;

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);

  // Check if user is still signed in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        return;
      }
      if (user.emailVerified) {
        setIsVerified(true);
      }
    });
    return () => unsubscribe();
  }, []);

  const getFirebaseError = (code: string): string => {
    const messages: Record<string, string> = {
      "auth/too-many-requests": t('auth.firebaseErrors.tooManyRequests'),
      "auth/network-request-failed": t('auth.firebaseErrors.networkRequestFailed'),
      "auth/user-not-found": t('auth.firebaseErrors.userNotFound'),
    };
    return messages[code] || t('auth.firebaseErrors.unexpectedError');
  };

  const handleResendVerification = async () => {
    if (isLoading || cooldown > 0) return;

    setIsLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error(t('auth.emailVerification.signInFirst'));
        router.push("/login");
        return;
      }

      await sendEmailVerification(currentUser, {
        url: `${window.location.origin}/login?verified=true`,
      });

      setMessage(t('auth.emailVerification.sentSuccess'));
      toast.success(t('auth.emailVerification.sentSuccess'));

      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e: any) {
      const msg = getFirebaseError(e.code);
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    setCheckingVerification(true);
    setErrorMessage("");

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error(t('auth.emailVerification.signInFirst'));
        router.push("/login");
        return;
      }

      await currentUser.reload();

      if (currentUser.emailVerified) {
        setIsVerified(true);
        toast.success(t('auth.emailVerification.verifiedSuccess'));
      } else {
        setErrorMessage(
          t('auth.emailVerification.notVerifiedYet')
        );
      }
    } catch (e: any) {
      setErrorMessage(getFirebaseError(e.code));
    } finally {
      setCheckingVerification(false);
    }
  };

  const handleBackToLogin = async () => {
    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch {
      // ignore
    }
    router.push("/login");
  };

  if (isVerified) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <svg
                className="h-8 w-8 text-green-600 dark:text-green-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('auth.emailVerification.verifiedTitle')}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('auth.emailVerification.verifiedMsg')}
            </p>
            <div className="mt-6">
              <Link
                href="/login"
                className="inline-flex justify-center py-2.5 px-6 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                {t('auth.emailVerification.goToSignIn')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
          {/* Mail Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <svg
              className="h-8 w-8 text-blue-600 dark:text-blue-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('auth.emailVerification.title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('auth.emailVerification.sent')}{" "}
            <strong className="text-gray-900 dark:text-gray-200">
              {email || t('auth.emailVerification.yourEmail')}
            </strong>
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
            {t('auth.emailVerification.linkPrompt')}
          </p>

          {/* Messages */}
          {message && (
            <div className="mt-6 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 px-4 py-3 text-sm text-green-700 dark:text-green-200">
              {message}
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-200">
              {errorMessage}
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 space-y-4">
            <button
              type="button"
              onClick={() => void handleCheckVerification()}
              disabled={checkingVerification}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkingVerification ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  {t('auth.emailVerification.checking')}
                </span>
              ) : (
                t('auth.emailVerification.verifiedMyEmail')
              )}
            </button>

            <button
              type="button"
              onClick={() => void handleResendVerification()}
              disabled={isLoading || cooldown > 0}
              className="w-full flex justify-center py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
                  {t('ui.loading')}
                </span>
              ) : cooldown > 0 ? (
                t('auth.emailVerification.resendIn', { values: { count: cooldown } })
              ) : (
                t('auth.emailVerification.resend')
              )}
            </button>
          </div>

          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
            <button
              type="button"
              onClick={() => void handleBackToLogin()}
              className="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline"
            >
              {t('auth.emailVerification.goToSignIn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

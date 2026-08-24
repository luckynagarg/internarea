'use client';

import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import axiosClient from "@/lib/axiosClient";
import { useT } from "@/i18n/runtime";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizePhone(phone: string) {
  return String(phone || "").replace(/[^0-9]/g, "");
}

function isValidPhone(digits: string) {
  return /^[0-9]{10,15}$/.test(digits);
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useT();

  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const detectedMethod: "email" | "phone" | null = useMemo(() => {
    const v = identifier.trim();
    if (!v) return null;
    if (isValidEmail(v)) return "email";
    const digits = normalizePhone(v);
    if (isValidPhone(digits)) return "phone";
    return null;
  }, [identifier]);

  const requestReset = async () => {
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    try {
      if (!detectedMethod) {
        throw new Error(t('auth.forgotPassword.invalidInput'));
      }

      const res = await axiosClient.post(
        `/api/auth/forgot-password`,
        {
          identifier: identifier.trim(),
        }
      );

      const msg =
        res?.data?.message ||
        t('auth.forgotPassword.desc');

      if (res?.data?.success === false) {
        setErrorMessage(msg);
        toast.error(msg);
      } else {
        setMessage(msg);
        toast.success(t('auth.forgotPassword.resetSent'));
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error?.message ||
        t('auth.forgotPassword.requestFailed');
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const canRequest =
    identifier.trim().length > 0 && !!detectedMethod && !loading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="max-w-xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('auth.forgotPassword.title')}
          </h1>

          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {t('auth.forgotPassword.desc')}
          </p>

          <div className="mt-6">
            <label
              htmlFor="identifier"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              {t('auth.forgotPassword.label')}
            </label>

            <input
              id="identifier"
              name="identifier"
              type="text"
              inputMode={detectedMethod === "phone" ? "tel" : "email"}
              autoComplete="email"
              className="mt-2 w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setMessage("");
                setErrorMessage("");
              }}
              placeholder={t('auth.forgotPassword.placeholder')}
              aria-invalid={!!identifier.trim() && !detectedMethod}
              aria-describedby="identifier-help"
            />

            <div
              id="identifier-help"
              className="mt-2 text-xs text-gray-500 dark:text-gray-400"
            >
              {detectedMethod ? (
                detectedMethod === "email" ? (
                  <span>{t('auth.forgotPassword.emailValid')}</span>
                ) : (
                  <span>{t('auth.forgotPassword.phoneValid')}</span>
                )
              ) : identifier.trim().length ? (
                <span>{t('auth.forgotPassword.invalidInput')}</span>
              ) : (
                <span>&nbsp;</span>
              )}
            </div>
          </div>

          {message ? (
            <div
              className="mt-5 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 px-4 py-3 whitespace-pre-line"
              role="status"
              aria-live="polite"
            >
              {message}
            </div>
          ) : null}

          {errorMessage ? (
            <div
              className="mt-5 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-200"
              role="alert"
              aria-live="assertive"
            >
              {errorMessage}
            </div>
          ) : null}

          <button
            type="button"
            disabled={!canRequest}
            onClick={requestReset}
            className="mt-6 w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                {t('auth.forgotPassword.sending')}
              </>
            ) : (
              t('auth.forgotPassword.sendBtn')
            )}
          </button>

          <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            <button
              type="button"
              className="underline hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => router.push("/login")}
            >
              {t('auth.forgotPassword.backToLogin')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

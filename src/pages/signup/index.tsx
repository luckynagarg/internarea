'use client';

import React, { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";
import { toast } from "react-toastify";
import { auth } from "@/lib/firebase";
import { useT } from "@/i18n/runtime";

function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score, label: "Weak", color: "#ef4444" };
  if (score <= 3) return { score, label: "Medium", color: "#f59e0b" };
  if (score <= 4) return { score, label: "Strong", color: "#10b981" };
  return { score, label: "Very Strong", color: "#059669" };
}

export default function SignupPage() {
  const router = useRouter();
  const { t } = useT();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form validation
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword;
  const isFormValid =
    fullName.trim().length >= 2 &&
    email.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    password.length >= 6 &&
    passwordsMatch;

  const getFirebaseSignupError = (code: string): string => {
    const messages: Record<string, string> = {
      "auth/email-already-in-use":
        t('auth.firebaseErrors.emailAlreadyInUse'),
      "auth/invalid-email": t('auth.firebaseErrors.invalidEmail'),
      "auth/weak-password": t('auth.firebaseErrors.weakPassword'),
      "auth/network-request-failed": t('auth.firebaseErrors.networkRequestFailed'),
      "auth/too-many-requests": t('auth.firebaseErrors.tooManyRequests'),
    };
    return messages[code] || t('auth.firebaseErrors.unexpectedError');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || !isFormValid) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Send email verification
      await sendEmailVerification(userCredential.user);

      // Sign out so user must verify email before accessing protected pages
      await signOut(auth);

      toast.success(
        t('auth.emailVerification.sentSuccess')
      );

      // Redirect to verify-email page
      router.push(`/verify-email?email=${encodeURIComponent(email.trim())}`);
    } catch (e: any) {
      const msg = getFirebaseSignupError(e.code);
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
          {t('auth.createAccount')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {t('auth.joinInternArea')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-200">
              {errorMessage}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSignup}>
            {/* Full Name */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('auth.fullName')}
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
                placeholder={t('auth.fullNamePlaceholder')}
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('auth.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('auth.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordTouched(true)}
                className="mt-2 w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
                placeholder={t('auth.passwordPlaceholder')}
              />
              {/* Password Strength Indicator */}
              {passwordTouched && password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className="h-1.5 flex-1 rounded-full"
                        style={{
                          backgroundColor:
                            level <= passwordStrength.score
                              ? passwordStrength.color
                              : "#e5e7eb",
                        }}
                      />
                    ))}
                  </div>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: passwordStrength.color }}
                  >
                    {passwordStrength.label === "Weak" && t('auth.passwordStrength.weak')}
                    {passwordStrength.label === "Medium" && t('auth.passwordStrength.medium')}
                    {passwordStrength.label === "Strong" && t('auth.passwordStrength.strong')}
                    {passwordStrength.label === "Very Strong" && t('auth.passwordStrength.veryStrong')}
                    {passwordStrength.label === "Weak" && ` ${t('auth.passwordHint')}`}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                {t('auth.confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setConfirmTouched(true)}
                className="mt-2 w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
                placeholder={t('auth.confirmPassword')}
              />
              {confirmTouched && confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-1 text-xs text-red-600">{t('auth.passwordMismatch')}</p>
              )}
              {confirmTouched &&
                confirmPassword.length > 0 &&
                passwordsMatch && (
                  <p className="mt-1 text-xs text-green-600">{t('auth.passwordMatch')}</p>
                )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  {t('auth.creatingAccount')}
                </span>
              ) : (
                t('auth.createAccountBtn')
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.alreadyHaveAccount')}{" "}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500 hover:underline"
              >
                {t('auth.signInPrompt')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

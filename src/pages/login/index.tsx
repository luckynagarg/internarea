'use client';

import React, { useState, useEffect, useCallback } from "react";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { auth, googleProvider } from "@/lib/firebase";
import Link from "next/link";
import {
  startLoginGate,
  verifyLoginOtp,
  resendLoginOtp,
} from "@/Feature/loginSecurity";

export default function LoginPage() {
  const router = useRouter();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

// Chrome OTP gate state
  const [otpRequired, setOtpRequired] = useState(false);
  const [otp, setOtp] = useState("");
  const [isOtpLoading, setIsOtpLoading] = useState(false);

  // After a successful Firebase sign-in, run the server-side login gate
  // (Chrome OTP + mobile time restriction). If OTP is required, block access.
  const runLoginGate = useCallback(
    async (method: "google" | "password" | "phone") => {
      let result;
      try {
        result = await startLoginGate(method);
      } catch (e: any) {
        // Server-side block (e.g. mobile outside allowed hours, or Chrome w/o email).
        const msg =
          e?.response?.data?.message ??
          e?.response?.data?.error ??
          e?.message ??
          "Login restricted.";
        await auth.signOut().catch(() => {});
        setLoginError(msg);
        toast.error(msg);
        return;
      }
      if (result.otpRequired) {
        setOtpRequired(true);
        setOtp("");
        return;
      }
      toast.success("Logged in successfully");
      router.push("/");
    },
    [router]
  );

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
      await runLoginGate("google");
    } catch (e: any) {
      if (e?.code === "auth/cancelled-popup-request") return;
      const msg = e?.message ?? "Google login failed.";
      setLoginError(msg);
      toast.error(msg);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [isGoogleLoading, router, runLoginGate]);

  const handleEmailLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!email.trim()) {
      setLoginError("Email is required.");
      return;
    }
    if (!password) {
      setLoginError("Password is required.");
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

      await runLoginGate("password");
    } catch (e: any) {
      const msg = e?.message ?? "Email login failed.";
      setLoginError(msg);
      toast.error(msg);
    } finally {
      setIsEmailLoading(false);
    }
  }, [email, password, rememberMe, router, runLoginGate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Sign in to your account
            </p>
          </div>

{loginError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {loginError}
            </div>
          )}

          {/* Chrome email OTP verification gate */}
          {otpRequired && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                Email verification required
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                We sent a one-time code to your email. Enter it below to continue.
              </p>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Enter OTP"
                maxLength={6}
                className="w-full px-3 py-2 mb-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
              />
              <button
                type="button"
                disabled={isOtpLoading || otp.length < 4}
                onClick={async () => {
                  setIsOtpLoading(true);
                  try {
                    const res = await verifyLoginOtp(otp);
                    if (res.accessGranted) {
                      setOtpRequired(false);
                      toast.success("Verified successfully");
                      router.push("/");
                    } else {
                      toast.error(res.message || "Invalid OTP.");
                    }
                  } catch (e: any) {
                    toast.error(e?.response?.data?.message ?? e?.message ?? "Invalid OTP.");
                  } finally {
                    setIsOtpLoading(false);
                  }
                }}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg text-sm"
              >
                {isOtpLoading ? "Verifying..." : "Verify OTP"}
              </button>
              <button
                type="button"
                disabled={isOtpLoading}
                onClick={async () => {
                  try {
                    await resendLoginOtp();
                    toast.success("OTP resent to your email.");
                  } catch (e: any) {
                    toast.error(e?.response?.data?.message ?? "Could not resend OTP.");
                  }
                }}
                className="w-full text-center text-xs text-blue-600 hover:underline mt-3"
              >
                Resend OTP
              </button>
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
              {isGoogleLoading ? "Signing in..." : "Continue with Google"}
            </span>
          </button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">OR</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                required
              />
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
                Remember me
              </label>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end -mt-2">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isEmailLoading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
            >
              {isEmailLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-blue-600 hover:text-blue-500 font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-300">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

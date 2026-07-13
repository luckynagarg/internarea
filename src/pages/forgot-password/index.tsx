'use client';

import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-toastify";

type IdentifierMethod = "email" | "phone";

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

  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState<"request" | "verify" | "reset">("request");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [successMessage, setSuccessMessage] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const detectedMethod: IdentifierMethod | null = useMemo(() => {
    const v = identifier.trim();
    if (!v) return null;
    if (isValidEmail(v)) return "email";
    const digits = normalizePhone(v);
    if (isValidPhone(digits)) return "phone";
    return null;
  }, [identifier]);

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  const requestOtp = async () => {
    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const method = detectedMethod;
      if (!method) {
        throw new Error("Please enter a valid email address or phone number.");
      }

      await axios.post(
        `${apiBase}/api/password-recovery/request`,
        {
          method,
          identifier: identifier.trim(),
        },
        { headers: { "Content-Type": "application/json" } }
      );

      setSuccessMessage(
        "If an account exists, we will send an OTP to help you reset your password."
      );
      toast.success("OTP requested.");
      setStep("verify");
    } catch (e: any) {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.message ||
        (status === 429
          ? "You can use this option only once per day."
          : "Request failed");

      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const method = detectedMethod;
      if (!method) throw new Error("Invalid identifier method.");
      if (!otp.trim()) throw new Error("OTP is required.");

      await axios.post(
        `${apiBase}/api/password-recovery/verify-otp`,
        {
          method,
          identifier: identifier.trim(),
          otp: otp.trim(),
        },
        { headers: { "Content-Type": "application/json" } }
      );

      setSuccessMessage("OTP verified.");
      toast.success("OTP verified.");
      setStep("reset");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "OTP verification failed.";

      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const method = detectedMethod;
      if (!method) throw new Error("Invalid identifier method.");
      if (!newPassword.trim()) throw new Error("New password is required.");

      await axios.post(
        `${apiBase}/api/password-recovery/reset-password`,
        {
          method,
          identifier: identifier.trim(),
          otp: otp.trim(),
          newPassword: newPassword,
        },
        { headers: { "Content-Type": "application/json" } }
      );

      setSuccessMessage("Password updated successfully.");
      toast.success("Password updated successfully.");
      router.push("/login");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Password reset failed.";

      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const canRequest =
    identifier.trim().length > 0 &&
    !!detectedMethod &&
    !loading &&
    step === "request";
  const canVerify =
    otp.trim().length > 0 &&
    !!detectedMethod &&
    !loading &&
    step === "verify";
  const canReset =
    newPassword.trim().length > 0 &&
    !!detectedMethod &&
    !loading &&
    step === "reset";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="max-w-xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Forgot Password
          </h1>

          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Enter your registered email address or phone number to receive an OTP
            and reset your password.
          </p>

          <div className="mt-6">
            <label
              htmlFor="identifier"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Email or Phone Number
            </label>

            <input
              id="identifier"
              name="identifier"
              type="text"
              inputMode={detectedMethod === "phone" ? "tel" : "email"}
              autoComplete="email"
              className="mt-2 w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or +91 98765 43210"
              aria-invalid={!!identifier.trim() && !detectedMethod}
              aria-describedby="identifier-help"
              disabled={step !== "request"}
            />

            <div
              id="identifier-help"
              className="mt-2 text-xs text-gray-500 dark:text-gray-400"
            >
              {detectedMethod ? (
                detectedMethod === "email" ? (
                  <span>Email looks valid.</span>
                ) : (
                  <span>Phone number looks valid.</span>
                )
              ) : identifier.trim().length ? (
                <span>Please enter a valid email address or phone number.</span>
              ) : (
                <span>&nbsp;</span>
              )}
            </div>
          </div>

          {step !== "request" ? (
            <div className="mt-6">
              {step === "verify" ? (
                <>
                  <label
                    htmlFor="otp"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    Enter OTP
                  </label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    className="mt-2 w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit OTP"
                    aria-invalid={!!otp.trim() && otp.trim().length !== 6}
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Check your email/phone for the OTP.
                  </p>
                </>
              ) : (
                <>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    className="mt-2 w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Use a strong password. Password must be at least 6 characters.
                  </p>
                </>
              )}
            </div>
          ) : null}

          {successMessage ? (
            <div
              className="mt-5 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 px-4 py-3 whitespace-pre-line"
              role="status"
              aria-live="polite"
            >
              {successMessage}
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

          {step === "request" ? (
            <button
              type="button"
              disabled={!canRequest}
              onClick={requestOtp}
              className="mt-6 w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Sending OTP...
                </>
              ) : (
                "Send OTP"
              )}
            </button>
          ) : step === "verify" ? (
            <button
              type="button"
              disabled={!canVerify}
              onClick={verifyOtp}
              className="mt-6 w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify OTP"
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canReset}
              onClick={resetPassword}
              className="mt-6 w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          )}

          <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            <button
              type="button"
              className="underline hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => router.push("/login")}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


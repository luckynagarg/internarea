'use client';

import React, { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { toast } from "react-toastify";

export default function AdminForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<"send-otp" | "verify-otp" | "reset-password">("send-otp");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  const sendOtp = async () => {
    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      await axios.post(
        `${apiBase}/api/admin/reset-password/send-otp`,
        {},
        { headers: { "Content-Type": "application/json" } }
      );

      setSuccessMessage(
        "If an admin account exists, an OTP has been sent to the registered email."
      );
      toast.success("OTP sent to admin email.");
      setStep("verify-otp");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to send OTP.";
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
      if (!otp.trim()) throw new Error("OTP is required.");

      await axios.post(
        `${apiBase}/api/admin/reset-password/verify-otp`,
        { otp: otp.trim() },
        { headers: { "Content-Type": "application/json" } }
      );

      setSuccessMessage("OTP verified successfully.");
      toast.success("OTP verified.");
      setStep("reset-password");
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
      if (!newPassword.trim()) throw new Error("New password is required.");
      if (newPassword.length < 6) throw new Error("Password must be at least 6 characters.");
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match.");

      await axios.post(
        `${apiBase}/api/admin/reset-password/update`,
        { newPassword },
        { headers: { "Content-Type": "application/json" } }
      );

      setSuccessMessage("Password updated successfully.");
      toast.success("Admin password updated.");
      router.push("/adminlogin");
    } catch (e: any) {
      const msg =
        e?.response?.data?.message || e?.message || "Password reset failed.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const canSendOtp = !loading && step === "send-otp";
  const canVerifyOtp = otp.trim().length === 6 && !loading && step === "verify-otp";
  const canReset =
    newPassword.trim().length >= 6 &&
    newPassword === confirmPassword &&
    !loading &&
    step === "reset-password";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
          Admin Password Reset
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {step === "send-otp" && "Request an OTP to reset your admin password."}
          {step === "verify-otp" && "Enter the OTP sent to your admin email."}
          {step === "reset-password" && "Choose a new admin password."}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {step === "send-otp" && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                An OTP will be sent to the registered admin email address.
                Please check your inbox (and spam folder) for the OTP.
              </p>

              {successMessage ? (
                <div className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 px-4 py-3 text-sm text-green-700 dark:text-green-200">
                  {successMessage}
                </div>
              ) : null}

              {errorMessage ? (
                <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-200">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="button"
                disabled={!canSendOtp}
                onClick={sendOtp}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Sending OTP...
                  </span>
                ) : (
                  "Send OTP"
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => router.push("/adminlogin")}
                  className="text-sm text-blue-600 hover:text-blue-500 hover:underline"
                >
                  Back to Admin Login
                </button>
              </div>
            </div>
          )}

          {step === "verify-otp" && (
            <div className="space-y-6">
              <div>
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
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  placeholder="6-digit OTP"
                  className="mt-2 w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
                />
              </div>

              {successMessage ? (
                <div className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 px-4 py-3 text-sm text-green-700 dark:text-green-200">
                  {successMessage}
                </div>
              ) : null}

              {errorMessage ? (
                <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-200">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="button"
                disabled={!canVerifyOtp}
                onClick={verifyOtp}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  "Verify OTP"
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep("send-otp");
                    setOtp("");
                    setErrorMessage("");
                    setSuccessMessage("");
                  }}
                  className="text-sm text-blue-600 hover:text-blue-500 hover:underline"
                >
                  Back to request OTP
                </button>
              </div>
            </div>
          )}

          {step === "reset-password" && (
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="mt-2 w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Must be at least 6 characters.
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-200"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="mt-2 w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
                />
                {confirmPassword && newPassword !== confirmPassword ? (
                  <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
                ) : null}
              </div>

              {successMessage ? (
                <div className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 px-4 py-3 text-sm text-green-700 dark:text-green-200">
                  {successMessage}
                </div>
              ) : null}

              {errorMessage ? (
                <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-200">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="button"
                disabled={!canReset}
                onClick={resetPassword}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Updating...
                  </span>
                ) : (
                  "Update Password"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


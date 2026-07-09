'use client';

import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/Components/ui/input-otp";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

export type PhoneOtpLoginProps = {
  /** Phone number format expected by Firebase, e.g. +91XXXXXXXXXX */
  defaultPhoneNumber?: string;
  /** Called after successful verification */
  onVerified?: () => void;
  /** Called on fatal errors (optional; errors are also shown inside the component) */
  onError?: (message: string) => void;
};

const RECATCHA_CONTAINER_ID = "recaptcha-container";
const COUNTDOWN_SECONDS = 60;

/**
 * Reusable Phone OTP flow.
 * - Initializes RecaptchaVerifier once (per component mount)
 * - Cleans up on unmount
 * - Supports resend with 60s countdown
 * - Prevents duplicate send requests
 */
export default function PhoneOtpLogin({
  defaultPhoneNumber = "",
  onVerified,
  onError,
}: PhoneOtpLoginProps) {
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState(defaultPhoneNumber);
  const [otp, setOtp] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const initAttemptedRef = useRef(false);

  const canSendOtp = useMemo(
    () => !isSendingOtp && resendCountdown <= 0 && !!phoneNumber,
    [isSendingOtp, resendCountdown, phoneNumber]
  );

  const ensureVerifier = async (): Promise<RecaptchaVerifier | null> => {
    if (typeof window === "undefined") return null;

    const container = document.getElementById(RECATCHA_CONTAINER_ID);
    if (!container) return null;

    if (recaptchaVerifierRef.current) return recaptchaVerifierRef.current;
    if (initAttemptedRef.current) return null;

    initAttemptedRef.current = true;
    try {
      const verifier = new RecaptchaVerifier(auth, RECATCHA_CONTAINER_ID, {
        size: "invisible",
      });
      recaptchaVerifierRef.current = verifier;
      return verifier;
    } catch (e: any) {
      const msg = e?.message ?? "Failed to initialize recaptcha.";
      setError(msg);
      onError?.(msg);
      return null;
    }
  };

  useEffect(() => {
    return () => {
      // cleanup
      recaptchaVerifierRef.current = null;
      initAttemptedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = window.setTimeout(() => setResendCountdown((p) => p - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendCountdown]);

  const sendOtp = async () => {
    setError(null);
    setSuccess(null);

    if (!phoneNumber) {
      const msg = "Please enter a phone number.";
      setError(msg);
      onError?.(msg);
      return;
    }

    if (!canSendOtp) return;

    const verifier = await ensureVerifier();
    if (!verifier) {
      const msg =
        "Recaptcha is not ready yet. Please wait a moment and try again.";
      setError(msg);
      onError?.(msg);
      return;
    }

    setIsSendingOtp(true);
    try {
      const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      setConfirmationResult(result);
      setSuccess("OTP sent successfully!");
      setResendCountdown(COUNTDOWN_SECONDS);
    } catch (e: any) {
      const msg = e?.message ?? "Failed to send OTP.";
      setError(msg);
      onError?.(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOtp = async (e: FormEvent) => {
    e.preventDefault();

    if (!confirmationResult) {
      const msg = "Please request an OTP first.";
      setError(msg);
      onError?.(msg);
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await confirmationResult.confirm(otp);
      setSuccess("Phone number verified successfully!");
      onVerified?.();
      router.push("/");
    } catch (e: any) {
      const msg = e?.message ?? "Failed to verify OTP.";
      setError(msg);
      onError?.(msg);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 space-y-6">
      <div id={RECATCHA_CONTAINER_ID} />

      <h1 className="text-2xl font-bold text-center">Login with Phone OTP</h1>

      {error && <p className="text-red-500 text-center">{error}</p>}
      {success && <p className="text-green-600 text-center">{success}</p>}

      {!confirmationResult ? (
        <form onSubmit={(e) => void (e.preventDefault(), sendOtp())} className="space-y-4">
          <Input
            type="tel"
            placeholder="+91 XXXXXXXXXX"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />

          <p className="text-xs text-gray-500">
            Please enter your phone number with country code (Example:
            +91XXXXXXXXXX)
          </p>

          <Button type="submit" disabled={isSendingOtp || resendCountdown > 0} className="w-full">
            {isSendingOtp ? "Sending..." : "Send OTP"}
          </Button>
        </form>
      ) : (
        <>
          <form onSubmit={verifyOtp} className="space-y-4">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            <Button type="submit" className="w-full" disabled={isSendingOtp}>
              Verify OTP
            </Button>
          </form>

          <Button
            type="button"
            onClick={() => void sendOtp()}
            disabled={!phoneNumber || isSendingOtp || resendCountdown > 0}
            className="w-full"
          >
            {isSendingOtp
              ? "Sending..."
              : resendCountdown > 0
                ? `Resend OTP in ${resendCountdown}s`
                : "Resend OTP"}
          </Button>
        </>
      )}

      {isSendingOtp && (
        <p className="text-center text-sm text-gray-500">Loading...</p>
      )}
    </div>
  );
}


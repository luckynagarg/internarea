'use client';

import { auth } from "@/lib/firebase";
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import React, { FormEvent, useEffect, useRef, useState } from "react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/Components/ui/input-otp";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { useRouter } from "next/router";
import { useT } from "@/i18n/runtime";

const RECATCHA_CONTAINER_ID = "recaptcha-container";

const OtpLogin = () => {
  const router = useRouter();
  const { t } = useT();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  const [resendCountdown, setResendCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const isRecaptchaContainerPresent = () => {
    if (typeof window === "undefined") return false;
    return !!document.getElementById(RECATCHA_CONTAINER_ID);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Wait until container exists in the DOM.
    if (!isRecaptchaContainerPresent()) return;
    if (recaptchaVerifierRef.current) return; // never initialize twice

    try {
      const verifier = new RecaptchaVerifier(auth, RECATCHA_CONTAINER_ID, {
        size: "invisible",
      });

      recaptchaVerifierRef.current = verifier;
    } catch (e) {
      // Leave error visible via OTP send; recaptcha can fail if misconfigured.
      // (Don't crash render.)
      console.error(e);
    }

    return () => {
      // Clear verifier on unmount.
      recaptchaVerifierRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // If the component mounts but container is rendered slightly later,
    // ensure the verifier is created as soon as the container exists.
    if (!isRecaptchaContainerPresent()) return;
    if (recaptchaVerifierRef.current) return;

    try {
      recaptchaVerifierRef.current = new RecaptchaVerifier(
        auth,
        RECATCHA_CONTAINER_ID,
        {
          size: "invisible",
        }
      );
    } catch (e) {
      console.error(e);
    }
    // Runs when confirmationResult changes (render flow), but won't duplicate due to ref guard.
  }, [confirmationResult]);

  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timer = window.setTimeout(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

  const getVerifier = () => recaptchaVerifierRef.current;

  const sendOTP = async () => {
    if (!phoneNumber) {
      setError(t('auth.otp.phoneRequired'));
      return;
    }

    if (isSendingOtp) return;
    if (resendCountdown > 0) return;

    const verifier = getVerifier();
    if (!verifier) {
      setError(
        t('auth.otp.recaptchaNotReady')
      );
      return;
    }

    setIsSendingOtp(true);
    setError(null);
    setSuccess("");

    try {
      const result = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        verifier
      );

      setConfirmationResult(result);
      setSuccess(t('common.postedSuccessfully'));
      setResendCountdown(60);
    } catch (err: any) {
      setError(err?.message ?? t('auth.otp.failedToSendOtp'));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSendOTP = (e: FormEvent) => {
    e.preventDefault();
    void sendOTP();
  };

  const handleVerifyOTP = async (e: FormEvent) => {
    e.preventDefault();

    if (!confirmationResult) {
      setError(t('auth.otp.otpRequired'));
      return;
    }

    setError(null);

    try {
      await confirmationResult.confirm(otp);
      setSuccess(t('auth.otp.verifiedSuccess'));
      router.push("/");
    } catch (err: any) {
      setError(err?.message ?? t('auth.otp.invalidOtp'));
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 space-y-6">
      <div id={RECATCHA_CONTAINER_ID}></div>

      <h1 className="text-2xl font-bold text-center">{t('auth.otp.title')}</h1>

      {error && <p className="text-red-500 text-center">{error}</p>}

      {success && <p className="text-green-600 text-center">{success}</p>}

      {!confirmationResult ? (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <Input
            type="tel"
            placeholder={t('auth.otp.phonePlaceholder')}
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />

          <p className="text-xs text-gray-500">
            {t('auth.otp.phoneHint')}
          </p>

          <Button type="submit" disabled={isSendingOtp} className="w-full">
            {isSendingOtp ? t('auth.otp.sending') : t('auth.otp.sendOtp')}
          </Button>
        </form>
      ) : (
        <>
          <form
            onSubmit={handleVerifyOTP}
            className="space-y-4"
          >
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

            <Button
              type="submit"
              className="w-full"
              disabled={isSendingOtp}
            >
              {t('auth.otp.verifyOtp')}
            </Button>
          </form>

          <Button
            type="button"
            onClick={() => void sendOTP()}
            disabled={
              !phoneNumber || isSendingOtp || resendCountdown > 0
            }
            className="w-full"
          >
            {isSendingOtp
              ? t('auth.otp.sending')
              : resendCountdown > 0
              ? t('auth.otp.resendOtpIn', { values: { count: resendCountdown } })
              : t('auth.otp.resendOtp')}
          </Button>
        </>
      )}

      {isSendingOtp && (
        <p className="text-center text-sm text-gray-500">{t('auth.otp.loading')}</p>
      )}
    </div>
  );
};

export default OtpLogin;

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  requestFrenchOtp,
  verifyFrenchOtp,
} from "@/Feature/frenchOtp";
import { useT } from "@/i18n/runtime";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
};

export default function FrenchOtpModal({
  isOpen,
  onClose,
  onVerified,
}: Props) {
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const { t } = useT();

  const title = useMemo(() => t('auth.frenchOtp.title'), [t]);

  // Request a fresh OTP whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    setOtp("");
    setError(null);
    setSent(false);
    setSending(true);

    (async () => {
      try {
        await requestFrenchOtp();
        if (mounted) setSent(true);
      } catch (e: any) {
        if (mounted) {
          setError(
            e?.response?.data?.error?.message ||
              e?.response?.data?.message ||
              t('auth.frenchOtp.sendOtpFailed')
          );
        }
      } finally {
        if (mounted) setSending(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen, t]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await verifyFrenchOtp(otp);
      if (!res.ok) {
        setError(t('auth.frenchOtp.invalidOtp'));
        return;
      }

      onVerified();
      onClose();
    } catch (e: any) {
      setError(
        e?.response?.data?.error?.message ||
          e?.response?.data?.message ||
          t('auth.frenchOtp.verificationFailed')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative w-full max-w-md rounded-xl bg-white shadow-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label={t('ui.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {sending
            ? t('auth.frenchOtp.sending')
            : t('auth.frenchOtp.enterOtp')}
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('auth.frenchOtp.otpLabel')}
        </label>
        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          type="text"
          inputMode="numeric"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder={t('auth.frenchOtp.otpPlaceholder')}
          disabled={submitting || sending}
        />

        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

        <div className="mt-5 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            disabled={submitting}
          >
            {t('auth.frenchOtp.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
            disabled={submitting || sending || otp.trim().length === 0}
          >
            {submitting ? t('auth.frenchOtp.verifying') : t('auth.frenchOtp.verifySwitch')}
          </button>
        </div>
      </div>
    </div>
  );
}

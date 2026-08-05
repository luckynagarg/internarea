import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  requestFrenchOtp,
  verifyFrenchOtp,
} from "@/Feature/frenchOtp";

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

  const title = useMemo(() => "Verify OTP for language switching", []);

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
              "Failed to send OTP. Please try again."
          );
        }
      } finally {
        if (mounted) setSending(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await verifyFrenchOtp(otp);
      if (!res.ok) {
        setError("Invalid OTP. Please try again.");
        return;
      }

      onVerified();
      onClose();
    } catch (e: any) {
      setError(
        e?.response?.data?.error?.message ||
          e?.response?.data?.message ||
          "OTP verification failed. Please try again."
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
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {sending
            ? "Sending OTP to your email…"
            : "Enter the OTP sent to your email to switch to Français."}
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-2">
          OTP
        </label>
        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          type="text"
          inputMode="numeric"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Enter OTP"
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
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
            disabled={submitting || sending || otp.trim().length === 0}
          >
            {submitting ? "Verifying…" : "Verify & Switch"}
          </button>
        </div>
      </div>
    </div>
  );
}

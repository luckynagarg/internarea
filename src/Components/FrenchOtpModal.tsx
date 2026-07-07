import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import { verifyFrenchOtp } from "@/Feature/frenchOtp";

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
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => "Verify OTP for language switching", []);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await verifyFrenchOtp(otp);
      if (!res.ok) {
        setError("Invalid OTP. Demo OTP is 123456.");
        return;
      }

      onVerified();
      onClose();
    } catch (e) {
      setError("OTP verification failed. Please try again.");
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
          Enter the OTP sent to your email to switch to Français.
          <br />
          <span className="text-xs text-gray-500">
            Demo OTP: <span className="font-mono">123456</span>
          </span>
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
          disabled={submitting}
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
            disabled={submitting || otp.trim().length === 0}
          >
            {submitting ? "Verifying…" : "Verify & Switch"}
          </button>
        </div>
      </div>
    </div>
  );
}


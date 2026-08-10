// Modular OTP flow for French language switching.
// Calls the real backend endpoints under /api/language/french-otp/*.
// The backend uses the authenticated Firebase user's verified email.

import axiosClient from "@/lib/axiosClient";

export type FrenchOtpRequest = {
  success: boolean;
  otpRequired: boolean;
  message?: string;
  expiresInSeconds?: number;
};

export type FrenchOtpVerification = {
  ok: boolean;
  message?: string;
};

export async function requestFrenchOtp(): Promise<FrenchOtpRequest> {
  const res = await axiosClient.post("/api/language/french-otp/request", {});
  return res.data as FrenchOtpRequest;
}

export async function verifyFrenchOtp(
  otp: string
): Promise<FrenchOtpVerification> {
  const res = await axiosClient.post("/api/language/french-otp/verify", {
    otp,
  });
  const data = res.data;
  return {
    ok: !!data?.verified,
    message: data?.message,
  };
}

/**
 * Checks with the backend whether the current user has already verified the
 * French language via OTP. This is the server-side source of truth — the
 * frontend cannot bypass verification by setting a localStorage flag.
 */
export async function getFrenchOtpStatus(): Promise<{
  ok: boolean;
  verified: boolean;
}> {
  try {
    const res = await axiosClient.get("/api/language/french-otp/status");
    const data = res.data;
    return {
      ok: true,
      verified: !!data?.verified,
    };
  } catch (e) {
    return { ok: false, verified: false };
  }
}

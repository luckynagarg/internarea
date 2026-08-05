// Modular OTP flow for French language switching.
// This is intentionally frontend-only for now (stubbed). Later you can replace
// these implementations with real backend calls.

export type FrenchOtpRequest = {
  destination: string; // e.g. email
};

export type FrenchOtpVerification = {
  ok: boolean;
};

export async function requestFrenchOtp(): Promise<FrenchOtpRequest> {
  // TODO: Replace with real backend call.
  // Example: POST /api/language/french-otp/request
  return { destination: "your email" };
}

export async function verifyFrenchOtp(otp: string): Promise<FrenchOtpVerification> {
  // TODO: Replace with real backend call.
  // Stub: always fail until backend endpoint is implemented.
  return { ok: false };
}


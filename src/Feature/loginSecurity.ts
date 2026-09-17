// Login security client — integrates with backend /api/login/start, /api/login/verify-otp,
// /api/login/resend-otp and /api/login/session-status. Enforces:
//   - Chrome email OTP requirement (server-validated)
//   - Mobile login time restriction (server-validated, 10AM-1PM IST)
//   - Login history recording (server-side)
//
// IMPORTANT: the login page MUST await startLoginGate() and only navigate to the
// dashboard once the SERVER has granted access. The server records the access
// state; getLoginSessionStatus() is the authoritative check used by the
// dashboard guard.
import axiosClient from "@/lib/axiosClient";

export type LoginStartResult = {
  accessGranted: boolean;
  otpRequired: boolean;
  verificationRequired?: boolean;
  accessExpiresAt?: string | null;
  message?: string;
};

/**
 * Called after Firebase sign-in to enforce Chrome OTP / mobile restrictions
 * and record login history. Returns whether the login is granted or OTP is
 * required. Throws on server-side block (e.g. mobile outside hours).
 */
export async function startLoginGate(
  loginMethod: "google" | "password" | "phone" = "google"
): Promise<LoginStartResult> {
  const res = await axiosClient.post("/api/login/start", { loginMethod });
  const data = res.data;
  return {
    accessGranted: !!data?.accessGranted,
    otpRequired: !!data?.otpRequired,
    verificationRequired: !!data?.verificationRequired,
    accessExpiresAt: data?.accessExpiresAt ?? null,
    message: data?.message,
  };
}

export async function verifyLoginOtp(otp: string): Promise<{
  accessGranted: boolean;
  message?: string;
}> {
  const res = await axiosClient.post("/api/login/verify-otp", { otp });
  const data = res.data;
  return {
    accessGranted: !!data?.accessGranted,
    message: data?.message,
  };
}

export async function resendLoginOtp(): Promise<{ message?: string }> {
  const res = await axiosClient.post("/api/login/resend-otp", {});
  return { message: res.data?.message };
}

export type LoginSessionStatus = {
  accessGranted: boolean;
  verificationRequired: boolean;
  otpPending: boolean;
  tracked: boolean;
  accessExpiresAt: string | null;
};

/**
 * Server-side login security state for the signed-in user.
 * Used by the protected-route guard so a manual visit to /dashboard cannot
 * bypass a security verification that is still outstanding.
 */
export async function getLoginSessionStatus(): Promise<LoginSessionStatus> {
  const res = await axiosClient.get("/api/login/session-status");
  const data = res.data?.data || {};
  return {
    accessGranted: !!data.accessGranted,
    verificationRequired: !!data.verificationRequired,
    otpPending: !!data.otpPending,
    tracked: !!data.tracked,
    accessExpiresAt: data.accessExpiresAt ?? null,
  };
}

// Login security client — integrates with backend /api/login/start, /api/login/verify-otp,
// /api/login/resend-otp. Enforces:
//   - Chrome email OTP requirement (server-validated)
//   - Mobile login time restriction (server-validated, 10AM-1PM IST)
//   - Login history recording (server-side)
import axiosClient from "@/lib/axiosClient";

export type LoginStartResult =
  | { accessGranted: true; otpRequired: false; message?: string }
  | { accessGranted: false; otpRequired: true; message?: string };

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
    message: data?.message,
  } as LoginStartResult;
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

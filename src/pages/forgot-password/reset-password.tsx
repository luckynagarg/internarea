import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

function generateLetterOnlyPassword(length = 12) {
  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const arr = new Array(length);
  // crypto.getRandomValues not available in Node; in browser it is.
  // If unavailable, fallback to Math.random (still functional but less ideal).
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const bytes = new Uint32Array(length);
    window.crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      arr[i] = letters[bytes[i] % letters.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      arr[i] = letters[Math.floor(Math.random() * letters.length)];
    }
  }
  return arr.join("");
}

function passwordStrength(pw: string) {
  // Letters-only strength estimate. More length increases score.
  const len = pw.length;
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);

  let score = 0;
  if (len >= 8) score += 1;
  if (len >= 12) score += 1;
  if (len >= 16) score += 1;
  if (hasLower && hasUpper) score += 1;

  const label = score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong";
  const color = score <= 1 ? "bg-red-100 text-red-700" : score === 2 ? "bg-amber-100 text-amber-700" : score === 3 ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700";

  return { score, label, color };
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const { method, identifier } = router.query as { method?: "email" | "phone"; identifier?: string };

  const [mode, setMode] = useState<"manual" | "generated">("manual");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const strength = useMemo(() => passwordStrength(password), [password]);

  const [candidate, setCandidate] = useState<string>("");
  const [acceptedCandidate, setAcceptedCandidate] = useState(false);

  const createCandidate = () => {
    const pw = generateLetterOnlyPassword(12);
    setCandidate(pw);
    setAcceptedCandidate(false);
  };

  const acceptCandidate = () => {
    if (!candidate) return;
    setPassword(candidate);
    setAcceptedCandidate(true);
    setMessage("");
  };

  const submit = async () => {
    setMessage("");
    if (!method || !identifier) return;

    if (!password || password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL || ""}/api/password-recovery/reset-password`, {
        method,
        identifier,
        otp: "000000", // client cannot know OTP after verification in this MVP
        newPassword: password,
      });

      router.push({ pathname: "/forgot-password/success", query: { method, identifier } });
    } catch (e: any) {
      setMessage(e?.response?.data?.error?.message || "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-600 mt-2 text-sm">Create a new password to regain access.</p>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700">Choose reset option</label>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                className={`px-4 py-2 rounded-lg border ${mode === "manual" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200"}`}
                onClick={() => setMode("manual")}
              >
                Manual
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-lg border ${mode === "generated" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200"}`}
                onClick={() => {
                  setMode("generated");
                  if (!candidate) createCandidate();
                }}
              >
                Generator
              </button>
            </div>
          </div>

          {mode === "generated" ? (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Generated password</label>
                <button
                  type="button"
                  onClick={() => {
                    createCandidate();
                    setAcceptedCandidate(false);
                  }}
                  className="text-sm text-blue-700 hover:underline"
                >
                  Regenerate
                </button>
              </div>

              {candidate ? (
                <div className="mt-3 border border-gray-200 rounded-xl p-3 bg-gray-50">
                  <div className="font-mono text-sm break-all">{candidate}</div>
                  <button
                    type="button"
                    onClick={acceptCandidate}
                    disabled={acceptedCandidate}
                    className="mt-3 w-full bg-blue-600 text-white font-semibold py-2 rounded-xl hover:bg-blue-700 disabled:opacity-60"
                  >
                    {acceptedCandidate ? "Selected" : "Use this password"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setAcceptedCandidate(false);
                }}
                className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${strength.color}`}>
              {strength.label}
            </div>
          </div>

          <div className="mt-5">
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-2 w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Re-enter new password"
            />
          </div>

          {message ? <div className="mt-4 text-sm text-red-600">{message}</div> : null}

          <button
            type="button"
            disabled={loading}
            onClick={submit}
            className="mt-6 w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}


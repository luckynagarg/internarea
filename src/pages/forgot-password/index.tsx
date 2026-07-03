import { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

export default function ForgotPassword() {
  const router = useRouter();
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const submit = async () => {
    setLoading(true);
    setMessage("");
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL || ""}/api/password-recovery/request`, {
        method,
        identifier,
      });

      // Always navigate to OTP screen.
      router.push({
        pathname: "/forgot-password/verify-otp",
        query: { method, identifier },
      });
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || "Request failed";
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow p-6 md:p-8">
          <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
          <p className="text-gray-600 mt-2">
            Recover your account using your registered email address or phone number.
          </p>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700">Recovery method</label>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                className={`px-4 py-2 rounded-lg border ${method === "email" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700"}`}
                onClick={() => setMethod("email")}
              >
                Email
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded-lg border ${method === "phone" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700"}`}
                onClick={() => setMethod("phone")}
              >
                Phone
              </button>
            </div>
          </div>

          <div className="mt-5">
            <label className="block text-sm font-medium text-gray-700">
              {method === "email" ? "Email address" : "Phone number"}
            </label>
            <input
              className="mt-2 w-full border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={method === "email" ? "you@example.com" : "+91 98765 43210"}
            />
          </div>

          {message ? <div className="mt-4 text-sm text-red-600">{message}</div> : null}

          <button
            disabled={loading || !identifier.trim()}
            onClick={submit}
            className="mt-6 w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Sending..." : "Request OTP"}
          </button>
        </div>
      </div>
    </div>
  );
}


import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getLoginSessionStatus } from "@/Feature/loginSecurity";

/**
 * Route guard for protected pages.
 *
 * Waits for the Firebase auth state to resolve (so a refresh keeps the
 * session), and redirects to /login if no user is signed in. While the
 * auth state is resolving, `ready` is false and pages should render
 * nothing (or a spinner) — never mock/demo data.
 *
 * SECURITY GATE: the guard also asks the SERVER (/api/login/session-status)
 * whether the current session still owes a security verification (e.g. an email
 * OTP). If so, it redirects to /verify-login-otp, so manually opening
 * /dashboard cannot bypass the login gate. The decision is never taken from
 * React/Redux/localStorage state.
 */
export function useRequireAuth(): { ready: boolean } {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!active) return;

      if (!user) {
        setReady(false);
        router.replace("/login");
        return;
      }

      try {
        const status = await getLoginSessionStatus();
        if (!active) return;

        if (!status.accessGranted) {
          setReady(false);
          router.replace(status.otpPending ? "/verify-login-otp" : "/login");
          return;
        }

        setReady(true);
      } catch {
        // An unavailable gate cannot authorize dashboard access.
        if (!active) return;
        setReady(false);
        router.replace("/login");
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  return { ready };
}

export default useRequireAuth;

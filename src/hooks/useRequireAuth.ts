import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

/**
 * Route guard for protected pages.
 *
 * Waits for the Firebase auth state to resolve (so a refresh keeps the
 * session), and redirects to /login if no user is signed in. While the
 * auth state is resolving, `ready` is false and pages should render
 * nothing (or a spinner) — never mock/demo data.
 */
export function useRequireAuth(): { ready: boolean } {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setReady(false);
        router.replace("/login");
      } else {
        setReady(true);
      }
    });
    return () => unsubscribe();
  }, [router]);

  return { ready };
}

export default useRequireAuth;

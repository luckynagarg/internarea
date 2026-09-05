import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import DashboardHeader from "@/Components/DashboardHeader";
import ErrorBoundary from "@/Components/ErrorBoundary";
import "@/styles/global.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { Provider, useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { store } from "../store/store";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { login, logout, selectuser } from "@/Feature/Userslice";
import axiosClient from "@/lib/apiClient";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { I18nProvider } from "@/i18n/runtime";

function AuthListener() {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authuser) => {
      if (authuser) {
        dispatch(
          login({
            uid: authuser.uid,
            photo: authuser.photoURL,
            name: authuser.displayName,
            email: authuser.email,
            phoneNumber: authuser.phoneNumber,
          })
        );

        // Ensure a UserProfile document exists for this account so the user
        // is discoverable in friend search / suggestions. Fire-and-forget,
        // deduped per uid per session.
        const uid = authuser.uid;
        if ((globalThis as any).__bootstrappedUid !== uid) {
          (globalThis as any).__bootstrappedUid = uid;
          axiosClient
            .post("/api/profile/bootstrap", {
              photo: authuser.photoURL ?? null,
            })
            .catch(() => {
              // Non-fatal: allow retry on next sign-in.
              (globalThis as any).__bootstrappedUid = null;
            });
        }
      } else {
        dispatch(logout());
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return null;
}

// Lightweight page transition indicator.
function PageLoader() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleComplete = () => setLoading(false);

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router]);

  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1">
      <div className="h-full bg-blue-600 animate-pulse" style={{ width: "80%", transition: "width 0.3s ease" }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout rules
// ---------------------------------------------------------------------------
// Standalone auth / post-payment pages: NO navbar, NO footer.
const AUTH_PAGES = [
  "/login",
  "/signup",
  "/adminlogin",
  "/forgot-password",
  "/admin-forgot-password",
  "/verify-email",
  "/verify-login-otp",
  "/payment/success",
  "/payment/failed",
  "/payment/cancel",
];

// Public marketing/browse pages: show the legacy global Navbar + Footer for
// signed-out visitors ONLY. Logged-in users get the dashboard header instead.
const PUBLIC_ROOTS = [
  "/about",
  "/contact",
  "/help",
  "/privacy",
  "/terms",
  "/internship",
  "/job",
  "/companies",
  "/search",
];

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  if (PUBLIC_ROOTS.includes(pathname)) return true;
  if (pathname.startsWith("/detailinternship/")) return true;
  if (pathname.startsWith("/detailjob/")) return true;
  return false;
}

// Admin panel routes get their own AdminLayout (rendered by each page), so the
// global Navbar/Footer must never appear there.
function isAdminRoute(pathname: string): boolean {
  return pathname === "/adminpanel" || pathname.startsWith("/adminpanel/");
}

function AppShell({
  Component,
  pageProps,
}: {
  Component: AppProps["Component"];
  pageProps: AppProps["pageProps"];
}) {
  const router = useRouter();
  const user = useSelector(selectuser);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => setAuthReady(true));
    return () => unsub();
  }, []);

  const pathname = router.pathname;
  const isAdminPage = isAdminRoute(pathname);
  const isAuthPage = AUTH_PAGES.includes(pathname);
  const isPublicPage = !isAuthPage && isPublicRoute(pathname);
  // Everything else is treated as an authenticated / dashboard route.
  const isDashboardRoute = !isAdminPage && !isAuthPage && !isPublicPage;
  const authenticated = !!user;

  // Admin + standalone auth pages: render the page with no global shell.
  if (isAdminPage || isAuthPage) {
    return <Component {...pageProps} />;
  }

  // Authenticated / dashboard area.
  if (isDashboardRoute) {
    if (authenticated) {
      // /dashboard renders its own header + sidebar layout; every other page
      // shares the dashboard header (the only authenticated navigation).
      const withHeader = pathname !== "/dashboard";
      return (
        <>
          {withHeader ? <DashboardHeader /> : null}
          <Component {...pageProps} />
        </>
      );
    }
    // Not yet authenticated: wait for Firebase auth to resolve so we never
    // flash the old public navbar to a signed-in user on refresh. Protected
    // pages use useRequireAuth to redirect to /login once authReady resolves.
    if (!authReady) return null;
    return <Component {...pageProps} />;
  }

  // Public page.
  if (authenticated) {
    // Signed-in visitor on a public page: dashboard header, no footer.
    return (
      <>
        <DashboardHeader />
        <Component {...pageProps} />
      </>
    );
  }

  // Signed-out visitor on a public page: legacy navbar + footer.
  if (!authReady) return null;
  return (
    <>
      <Navbar />
      <Component {...pageProps} />
      <Footer />
    </>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <I18nProvider>
        <ErrorBoundary>
          <AuthListener />
          <PageLoader />
          <div className="bg-white">
            <ToastContainer
              position="top-right"
              autoClose={4000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              pauseOnHover
              draggable
              theme="light"
            />
            <AppShell Component={Component} pageProps={pageProps} />
          </div>
        </ErrorBoundary>
      </I18nProvider>
    </Provider>
  );
}


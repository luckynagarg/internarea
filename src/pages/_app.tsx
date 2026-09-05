import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import ErrorBoundary from "@/Components/ErrorBoundary";
import "@/styles/global.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { Provider, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { store } from "../store/store";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { login, logout } from "@/Feature/Userslice";
import axiosClient from "@/lib/apiClient";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Analytics } from "@vercel/analytics/next";
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

// Routes where the global Navbar/Footer should be hidden (auth pages + admin panel)
const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/adminlogin",
  "/forgot-password",
  "/admin-forgot-password",
  "/verify-email",
  "/verify-login-otp",
];

// Helper: check if a path is an admin panel route
function isAdminRoute(pathname: string): boolean {
  if (pathname === "/adminpanel" || pathname.startsWith("/adminpanel/")) {
    return true;
  }
  return false;
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isAuthRoute = AUTH_ROUTES.includes(router.pathname);
  const isAdminPage = isAdminRoute(router.pathname);

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
            {!(isAuthRoute || isAdminPage) && <Navbar />}
            <Component {...pageProps} />
            {!(isAuthRoute || isAdminPage) && <Footer />}
          </div>
        </ErrorBoundary>
      </I18nProvider>
    </Provider>
  );
}


import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import "@/styles/global.css";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { Provider, useDispatch } from "react-redux";
import { useEffect } from "react";
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
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[Auth Debug] onAuthStateChanged', {
          uid: authuser?.uid ?? null,
          email: authuser?.email ?? null,
          displayName: authuser?.displayName ?? null,
          photoURL: authuser?.photoURL ?? null,
          emailVerified: authuser?.emailVerified ?? null,
        });
      }
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

// Routes where the global Navbar/Footer should be hidden (auth pages)
const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/adminlogin",
  "/forgot-password",
  "/admin-forgot-password",
  "/verify-email",
  "/verify-login-otp",
];

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isAuthRoute = AUTH_ROUTES.includes(router.pathname);

  return (
    <Provider store={store}>
      <I18nProvider>
        <AuthListener />
        <div className="bg-white">
          <ToastContainer />
          {!isAuthRoute && <Navbar />}
          <Component {...pageProps} />
          {!isAuthRoute && <Footer />}
        </div>
      </I18nProvider>
    </Provider>
  );
}


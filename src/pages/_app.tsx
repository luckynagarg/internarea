import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import  "@/styles/global.css";
import type { AppProps } from "next/app";

import { Provider, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { store } from "../store/store";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { login, logout } from "@/Feature/Userslice";
import axios from "axios";

import { ToastContainer } from "react-toastify";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import "react-toastify/dist/ReactToastify.css";
import { LanguageProvider } from "@/i18n/LanguageContext";

function AuthListener() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://intern-backend-4dlt.onrender.com";


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authuser) => {
      if (authuser) {
        // Keep existing behavior first (do not break UI)
        dispatch(
          login({
            uid: authuser.uid,
            photo: authuser.photoURL,
            name: authuser.displayName,
            email: authuser.email,
            phoneNumber: authuser.phoneNumber,
          })
        );

        // Lazy-create/load Mongo UserProfile and enrich Redux with cached fields
        try {
          const run = async () => {
            const token = await auth.currentUser?.getIdToken();
            if (!token) return;

            const res = await axios.post(
              `${API_BASE}/api/profile/bootstrap`,
              { photo: authuser.photoURL },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            const profile = res.data?.data;
            if (profile) {
              dispatch(
                login({
                  uid: profile.firebaseUid || authuser.uid,
                  photo: profile.photo || authuser.photoURL,
                  name: profile.name || authuser.displayName,
                  email: profile.email || authuser.email,
                  phoneNumber: authuser.phoneNumber,
                })
              );
            }
          };

          void run();
        } catch (e) {
          // Non-fatal: keep app usable even if profile bootstrap fails.
        }
      } else {
        dispatch(logout());
      }


      setLoading(false);
    });

    return () => unsubscribe();
  }, [dispatch]);

  // optional loading screen (prevents UI flash)
  if (loading) return null;

  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <LanguageProvider>
        <AuthListener />
        <div className="bg-white">
          <ToastContainer />
          <Navbar />
          <Component {...pageProps} />
          <Footer />
        </div>
      </LanguageProvider>
    </Provider>
  );
}
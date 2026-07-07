import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import "@/styles/global.css";
import type { AppProps } from "next/app";

import { Provider, useDispatch } from "react-redux";
import { useEffect, useState } from "react";
import { store } from "../store/store";
import { auth } from "@/firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { login, logout } from "@/Feature/Userslice";
import { ToastContainer } from "react-toastify";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import "react-toastify/dist/ReactToastify.css";
import { LanguageProvider } from "@/i18n/LanguageContext";

function AuthListener() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

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
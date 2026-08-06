import Footer from "@/Components/Fotter";
import Navbar from "@/Components/Navbar";
import "@/styles/global.css";
import type { AppProps } from "next/app";
import { Provider, useDispatch } from "react-redux";
import { useEffect } from "react";
import { store } from "../store/store";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { login, logout } from "@/Feature/Userslice";
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
      } else {
        dispatch(logout());
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <I18nProvider>
        <AuthListener />
        <div className="bg-white">
          <ToastContainer />
          <Navbar />
          <Component {...pageProps} />
          <Footer />
        </div>
      </I18nProvider>
    </Provider>
  );
}


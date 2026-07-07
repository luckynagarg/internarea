import React, { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { auth, provider } from "../firebase/firebase";
import { Globe, Search } from "lucide-react";
import { signInWithPopup, signOut } from "firebase/auth";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import { SupportedLang, supportedLangs } from "@/i18n/langs";
import { useLanguage } from "@/i18n/LanguageContext";
import FrenchOtpModal from "@/Components/FrenchOtpModal";
import NotificationDropdown from "@/Components/NotificationDropdown";

const NAV_LANGS = [
  { key: "en" as const, label: "English" },
  { key: "hi" as const, label: "हिन्दी (Hindi)" },
  { key: "fr" as const, label: "Français (French)" },
  // repo i18n doesn't include pt in requirements dropdown order, so we keep actual dropdown keys.
  { key: "es" as const, label: "Español (Spanish)" },
  // repo i18n doesn't include de, map Deutsch -> en
  { key: "en" as const, label: "Deutsch (German)" },
  { key: "zh" as const, label: "中文 (Chinese)" },
] as const;

type DropdownLangKey = (typeof NAV_LANGS)[number]["key"];

function isSupportedLang(x: string): x is SupportedLang {
  return supportedLangs.includes(x as SupportedLang);
}

const Navbar = () => {
  const user = useSelector(selectuser);
  const { lang, setLang, t } = useLanguage();

  const langDropdownRef = useRef<HTMLDivElement | null>(null);

  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [pendingLang, setPendingLang] = useState<SupportedLang | null>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!langDropdownOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (!langDropdownRef.current) return;
      if (langDropdownRef.current.contains(target)) return;
      setLangDropdownOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [langDropdownOpen]);

  const [loggingIn, setLoggingIn] = useState(false);

  const handlelogin = async () => {
    if (loggingIn) return;

    setLoggingIn(true);

    try {
      await signInWithPopup(auth, provider);
      toast.success("Logged in successfully");
    } catch (error: any) {
      console.error("Google sign-in error:", error);

      if (error.code === "auth/cancelled-popup-request") {
        // Ignore this error because another popup request cancelled it.
        return;
      }

      toast.error(
        error?.message ||
          error?.code ||
          "Google login failed. Check console for details.",
      );
    } finally {
      setLoggingIn(false);
    }
  };
  const handlelogout = () => {
    signOut(auth);
  };

  const selectLang = (next: SupportedLang) => {
    // French requires OTP verification
    if (next === "fr") {
      setPendingLang(next);
      setOtpModalOpen(true);
      return;
    }

    setLang(next);
    setLangDropdownOpen(false);
  };

  const handleFrenchVerified = () => {
    const next = pendingLang ?? "fr";
    setLang(next);
    setPendingLang(null);
    setLangDropdownOpen(false);
  };

  return (
    <div className="relative">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="shrink-0">
              <a href="/" className="text-xl font-bold text-blue-600">
                <img
                  src={"/logo.png"}
                  alt=""
                  className="h-10 sm:h-12 md:h-14 lg:h-16 w-auto"
                />
              </a>
            </div>

            {/* Mobile nav toggle */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100"
              aria-label="Open navigation"
              onClick={() => {
                const el = document.getElementById("mobile-nav");
                if (!el) return;
                el.dataset.open = el.dataset.open === "true" ? "false" : "true";
                el.classList.toggle("opacity-100");
                el.classList.toggle("pointer-events-auto");
                el.classList.toggle("-translate-y-1");
                el.classList.toggle("h-auto");
              }}
            >
              <svg
                className="w-6 h-6 text-gray-800"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            </button>

            {/* Navigation Links (desktop) */}
            <div className="hidden md:flex items-center ml-4 space-x-4">
              <button className="flex items-center font-bold border-b-2 border-blue-600 pb-1 space-x-4 text-gray-800 hover:text-blue-600">
                <Link href={"/internship"}>
                  <span>{t("navbar.internships")}</span>
                </Link>
              </button>

              <button className="flex items-center font-bold border-b-2 border-transparent pb-1 text-gray-700 hover:text-blue-600">
                <Link href="/public">
                  <>
                    <span className="hidden lg:inline">
                      {t("navbar.publicSpace")}
                    </span>
                    <span className="lg:hidden">Public</span>
                  </>
                </Link>
              </button>

              <div className="hidden lg:flex items-center gap-3 bg-gray-100 rounded-full px-3 py-2">
                <Search size={16} className="text-gray-400" />
                <Link
                  href="/search"
                  className="ml-2 bg-transparent focus:outline-none text-sm w-48"
                >
                  {/* Keep navbar design; search page provides functional search. */}
                  <span className="text-gray-500">
                    {t("navbar.searchPlaceholder")}
                  </span>
                </Link>

                <div className="relative" ref={langDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setLangDropdownOpen((v) => !v)}
                    className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-200"
                    aria-label="Select language"
                  >
                    <Globe size={16} className="text-gray-900" />
                    <span className="text-sm text-gray-900">
                      {lang === "hi"
                        ? "हिन्दी"
                        : lang === "es"
                          ? "Español"
                          : lang === "fr"
                            ? "Français"
                            : lang === "zh"
                              ? "中文"
                              : "English"}
                    </span>
                  </button>

                  {langDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-gray-600 shadow-lg border overflow-hidden z-50">
                      <div className="px-3 py-2 text-xs font-medium bg-amber-100 text-gray-800">
                        {t("navbar.language")}
                      </div>
                      {NAV_LANGS.map((l) => {
                        const isCurrent =
                          l.label === "Deutsch (German)"
                            ? lang === "en"
                            : l.key === lang;
                        return (
                          <button
                            key={l.label}
                            type="button"
                            onClick={() => {
                              const target =
                                isCurrent && l.label !== "Deutsch (German)"
                                  ? l.key
                                  : (l.key as SupportedLang);
                              selectLang(target);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center justify-between ${
                              isCurrent ? "bg-gray-800" : ""
                            }`}
                          >
                            <span>{l.label}</span>
                            {((l.key === lang &&
                              l.label !== "Deutsch (German)") ||
                              (l.label === "Deutsch (German)" &&
                                lang === "en")) && (
                              <span className="text-blue-600  font-semibold">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Notification Bell */}
                <div className="relative">
                  <button
                    type="button"
                    className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-200"
                    aria-label="Open notifications"
                    onClick={() => setNotifOpen((v) => !v)}
                  >
                    <span className="sr-only">Notifications</span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4 text-gray-900"
                    >
                      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <span className="absolute -top-0.5 -right-0.5 bg-blue-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  </button>

                  <NotificationDropdown
                    open={notifOpen}
                    onClose={() => setNotifOpen(false)}
                    onMarkRead={(nextItems) => {
                      setUnreadCount(nextItems.filter((x) => !x.read).length);
                    }}
                  />
                </div>
              </div>

              {/* Notification dropdown rendered at root of navbar container below */}
            </div>

            {/* Auth Buttons (desktop) */}
            <div className="hidden md:flex items-center space-x-4 flex-shrink-0">
              {user ? (
                <div className="relative flex">
                  <button className="flex items-center space-x-2">
                    {" "}
                    <Link href={"/profile"}>
                      <img
                        src={user.photo}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    </Link>
                  </button>
                  <button
                    className="flex items-center w-full px-4 py-2  text-gray-700  hover:bg-gray-200 rounded-lg"
                    onClick={handlelogout}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={handlelogin}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-4 py-2 hover:bg-gray-50 flex-shrink-0"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span className="text-gray-700">
                      {t("navbar.continueWithGoogle")}
                    </span>
                  </button>
                  {/* <button className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700">
                    {" "}
                    <Link href={"/"}>Register</Link>
                  </button> */}
                  <a
                    href="/adminlogin"
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Admin
                  </a>
                </>
              )}
            </div>

            {/* Mobile panel */}
            <div
              id="mobile-nav"
              data-open="false"
                  className="lg:hidden absolute left-0 right-0 top-16 z-[9999] bg-white shadow-md border-t transition-all duration-200 opacity-0 pointer-events-none h-0 overflow-hidden"
            >
              <div className="px-4 py-3 flex flex-col space-y-3">
                <button className="flex items-center font-bold border-b-2 border-blue-600 pb-1 space-x-2 text-gray-800 hover:text-blue-600">
                  <Link href={"/internship"}>
                    <span>{t("navbar.internships")}</span>
                  </Link>
                </button>

                <button className="flex items-center font-bold border-b-2 border-transparent pb-1 space-x-2 text-gray-700 hover:text-blue-600">
                  <Link href={"/public"}>
                    <span>{t("navbar.publicSpace")}</span>
                  </Link>
                </button>

                <div className="flex items-center gap-3 bg-gray-100 rounded-full px-3 py-2">
                  <Search size={16} className="text-gray-400" />
                  <Link
                    href="/search"
                    className="ml-2 bg-transparent focus:outline-none text-sm w-full"
                  >
                    <span className="text-gray-500">
                      {t("navbar.searchPlaceholder")}
                    </span>
                  </Link>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setLangDropdownOpen((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-gray-200"
                    aria-label="Select language"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Globe size={16} className="text-gray-900" />
                      <span className="text-sm text-gray-900">
                        {lang === "hi"
                          ? "हिन्दी"
                          : lang === "es"
                            ? "Español"
                            : lang === "fr"
                              ? "Français"
                              : lang === "zh"
                                ? "中文"
                                : "English"}
                      </span>
                    </span>
                  </button>

                  {langDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-gray-600 shadow-lg border overflow-hidden z-50">
                      <div className="px-3 py-2 text-xs font-medium bg-amber-100 text-gray-800">
                        Language
                      </div>
                      {NAV_LANGS.map((l) => {
                        const isCurrent =
                          l.label === "Deutsch (German)"
                            ? lang === "en"
                            : l.key === lang;
                        return (
                          <button
                            key={l.label}
                            type="button"
                            onClick={() => {
                              const target =
                                isCurrent && l.label !== "Deutsch (German)"
                                  ? l.key
                                  : (l.key as SupportedLang);
                              selectLang(target);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center justify-between ${
                              isCurrent ? "bg-gray-800" : ""
                            }`}
                          >
                            <span>{l.label}</span>
                            {((l.key === lang &&
                              l.label !== "Deutsch (German)") ||
                              (l.label === "Deutsch (German)" &&
                                lang === "en")) && (
                              <span className="text-blue-600 font-semibold">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2 pt-1">
                  {user ? (
                    <>
                      <div className="flex items-center gap-3">
                        <Link href={"/profile"}>
                          <img
                            src={user.photo}
                            alt=""
                            className="w-9 h-9 rounded-full"
                          />
                        </Link>
                        <button
                          className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
                          onClick={handlelogout}
                        >
                          Logout
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handlelogin}
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 flex items-center justify-center space-x-2 hover:bg-gray-50"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        <span className="text-gray-700">
                          {t("navbar.continueWithGoogle")}
                        </span>
                      </button>
                      <a
                        href="/adminlogin"
                        className="text-gray-600 hover:text-gray-800 text-center"
                      >
                        {t("navbar.admin")}
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>{" "}
        </div>
      </nav>

      <FrenchOtpModal
        isOpen={otpModalOpen}
        onClose={() => {
          setOtpModalOpen(false);
          setPendingLang(null);
        }}
        onVerified={handleFrenchVerified}
      />
    </div>
  );
};

export default Navbar;

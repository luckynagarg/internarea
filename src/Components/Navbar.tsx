import React, { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Globe, Search } from "lucide-react";
import { signOut } from "firebase/auth";

import FrenchOtpModal from "@/Components/FrenchOtpModal";
import NotificationDropdown from "@/Components/NotificationDropdown";
import { useLanguage } from "@/i18n/LanguageContext";
import { selectuser } from "@/Feature/Userslice";
import { supportedLangs } from "@/i18n/langs";
import type { SupportedLang } from "@/i18n/langs";

import { auth } from "@/lib/firebase";

const NAV_LANGS = [
  { key: "en" as const, label: "English" },
  { key: "hi" as const, label: "हिन्दी (Hindi)" },
  { key: "fr" as const, label: "Français (French)" },
  { key: "es" as const, label: "Español (Spanish)" },
  // repo i18n doesn't include de, map Deutsch -> en
  { key: "en" as const, label: "Deutsch (German)" },
  { key: "zh" as const, label: "中文 (Chinese)" },
] as const;

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

  const handlelogout = () => {
    signOut(auth)
      .then(() => toast.success("Logged out"))
      .catch(() => toast.error("Logout failed"));
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
                    <span className="hidden lg:inline">{t("navbar.publicSpace")}</span>
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
                  <span className="text-gray-500">{t("navbar.searchPlaceholder")}</span>
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
                          l.label === "Deutsch (German)" ? lang === "en" : l.key === lang;

                        return (
                          <button
                            key={l.label}
                            type="button"
                            onClick={() => {
                              const target =
                                isCurrent && l.label !== "Deutsch (German)"
                                  ? l.key
                                  : (l.key as SupportedLang);
                              if (isSupportedLang(target)) {
                                selectLang(target);
                              }
                              setLangDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center justify-between ${
                              isCurrent ? "bg-gray-800" : ""
                            }`}
                          >
                            <span>{l.label}</span>
                            {((l.key === lang && l.label !== "Deutsch (German)") ||
                              (l.label === "Deutsch (German)" && lang === "en")) && (
                              <span className="text-blue-600 font-semibold">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {user && (
                  /* Notification Bell (ONLY if logged in) */
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
                )}
              </div>


              {/* Notification dropdown rendered at root of navbar container below */}
            </div>

            {/* Auth Buttons (desktop) */}
            <div className="hidden md:flex items-center space-x-4 flex-shrink-0">
              {user ? (
                <div className="relative flex">
                  <Link href="/profile">
                    <img
                      src={user.photo}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  </Link>
                  <button
                    className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
                    onClick={handlelogout}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-4 py-2 hover:bg-gray-50 flex-shrink-0"
                >
                  <span className="text-gray-700 font-medium">Login</span>
                </Link>
              )}

              {/* Keep existing Admin link */}
              {!user && (
                <a href="/adminlogin" className="text-gray-600 hover:text-gray-800">
                  Admin
                </a>
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
                  <Link href="/public">
                    <span>{t("navbar.publicSpace")}</span>
                  </Link>
                </button>

                <div className="flex items-center gap-3 bg-gray-100 rounded-full px-3 py-2">
                  <Search size={16} className="text-gray-400" />
                  <Link
                    href="/search"
                    className="ml-2 bg-transparent focus:outline-none text-sm w-full"
                  >
                    <span className="text-gray-500">{t("navbar.searchPlaceholder")}</span>
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
                          l.label === "Deutsch (German)" ? lang === "en" : l.key === lang;

                        return (
                          <button
                            key={l.label}
                            type="button"
                            onClick={() => {
                              const target =
                                isCurrent && l.label !== "Deutsch (German)"
                                  ? l.key
                                  : (l.key as SupportedLang);
                              if (isSupportedLang(target)) {
                                selectLang(target);
                              }
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center justify-between ${
                              isCurrent ? "bg-gray-800" : ""
                            }`}
                          >
                            <span>{l.label}</span>
                            {((l.key === lang && l.label !== "Deutsch (German)") ||
                              (l.label === "Deutsch (German)" && lang === "en")) && (
                              <span className="text-blue-600 font-semibold">✓</span>
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
                        <Link href="/profile">
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
                      <Link
                        href="/login"
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 flex items-center justify-center space-x-2 hover:bg-gray-50"
                      >
                        <span className="text-gray-700 font-medium">Login</span>
                      </Link>
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


/**
 * DashboardHeader — the post-login navigation bar.
 *
 * This is the SINGLE authenticated header shown across dashboard/authenticated
 * pages. It replaces the legacy global `Navbar` for signed-in users and mirrors
 * the dashboard's preferred header design (logo + page title + quick-action
 * icons + avatar + logout). It is sticky and responsive.
 *
 * It is rendered centrally from `_app` for authenticated routes so we do NOT
 * duplicate headers and it stays consistent while navigating.
 */
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { signOut } from "firebase/auth";
import { useSelector } from "react-redux";
import {
  Bell,
  Search,
  LogOut,
  Menu,
  X,
  User,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { selectuser } from "@/Feature/Userslice";
import { useT } from "@/i18n/runtime";
import { resetAuthData } from "@/lib/authStorage";
import axiosClient from "@/lib/apiClient";

// Map a route to an i18n label so the header always shows a sensible title.
function pageTitleKey(pathname: string): string | null {
  switch (pathname) {
    case "/dashboard":
      return "dashboard.title";
    case "/profile":
      return "navbar.profile";
    case "/public":
      return "navbar.publicSpace";
    case "/friends":
      return "navbar.friends";
    case "/subscription":
      return "subscription.title";
    case "/notifications":
      return "navbar.notifications";
    case "/messages":
    case "/chat":
      return "navbar.messages";
    case "/internship":
      return "navbar.internships";
    case "/job":
      return "navbar.jobs";
    default:
      return null;
  }
}

export default function DashboardHeader() {
  const router = useRouter();
  const { t } = useT();
  const user = useSelector(selectuser) as any;
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const titleKey = pageTitleKey(router.pathname);
  const title = titleKey === null ? null : t(titleKey);

  // Fetch the unread notification count once for the bell badge.
  useEffect(() => {
    let mounted = true;
    axiosClient
      .get("/api/notifications?limit=20")
      .then((res) => {
        const list = res?.data?.notifications ?? [];
        if (mounted && Array.isArray(list)) {
          setUnreadCount(list.filter((n: any) => !n?.read).length);
        }
      })
      .catch(() => {
        /* badge is non-essential */
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch {
      /* continue clearing local state regardless */
    }
    resetAuthData();
    setMenuOpen(false);
    router.replace("/");
  };

  const navItems = useMemo(
    () => [
      { href: "/internship", label: t("navbar.internships") },
      { href: "/job", label: t("navbar.jobs") },
      { href: "/public", label: t("navbar.publicSpace") },
      { href: "/friends", label: t("navbar.friends") },
    ],
    [t]
  );

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="shrink-0" aria-label="InternArea home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="InternArea" className="h-9 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <Link
              href="/search"
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </Link>

            {/* Notifications */}
            <Link
              href="/notifications"
              className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            {/* Profile */}
            <Link href="/profile" className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors">
              {user?.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
              )}
            </Link>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* Mobile Menu */}
            <button
              type="button"
              onClick={() => setMenuOpen((s) => !s)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/search"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Search
            </Link>
            <Link
              href="/messages"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Messages
            </Link>
            <Link
              href="/profile"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Profile
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-gray-100"
            >
              Logout
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
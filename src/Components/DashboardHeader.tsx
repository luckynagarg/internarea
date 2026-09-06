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
  MessageSquare,
  Users,
  CreditCard,
  Bookmark,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { selectuser } from "@/Feature/Userslice";
import { useT } from "@/i18n/runtime";
import { resetAuthData } from "@/lib/authStorage";
import axiosClient from "@/lib/apiClient";

// Map a route to an i18n label so the header always shows a sensible title.
// Uses only keys known to exist in the dictionaries; unknown routes show the
// welcome greeting without a page subtitle (never a broken key).
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
      return "navbar.messages";
    case "/chat":
      return "navbar.messages";
    case "/users":
      return "navbar.search";
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
      { href: "/", label: t("footer.links.home"), icon: LayoutDashboard },
      { href: "/chat", label: t("navbar.messages"), icon: MessageSquare },
      { href: "/friends", label: t("navbar.friends"), icon: Users },
      { href: "/public", label: t("navbar.publicSpace"), icon: Bookmark },
      { href: "/subscription", label: t("subscription.title"), icon: CreditCard },
      { href: "/profile", label: t("navbar.profile"), icon: LayoutDashboard },
    ],
    [t]
  );

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="shrink-0" aria-label="InternArea home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="" className="h-10 w-auto" />
            </Link>
            {title && (
              <div className="hidden md:block leading-tight min-w-0">
                <div className="text-sm text-gray-600 truncate">
                  {t("dashboard.welcome", {
                    values: { user: user?.name ? `, ${user.name}` : "" },
                  })}
                </div>
                <div className="text-lg font-semibold text-gray-900 truncate">{title}</div>
              </div>
            )}
          </div>

          {/* Desktop quick nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors whitespace-nowrap"
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              className="relative p-2 rounded-full hover:bg-gray-100"
              aria-label="Open notifications"
            >
              <Bell className="w-5 h-5 text-gray-700" />
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full text-[10px] px-1.5 py-0.5 font-bold">
                  {unreadCount}
                </span>
              ) : null}
            </Link>
            <Link href="/profile" className="shrink-0 p-1 rounded-full hover:bg-gray-100" aria-label="Open profile">
              {user?.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photo} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                  {user?.name ? user.name.charAt(0).toUpperCase() : ""}
                </div>
              )}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-700 hover:text-red-600 transition-colors"
              aria-label="Logout"
              title={t("navbar.logout")}
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((s) => !s)}
              className="md:hidden p-2 rounded-full hover:bg-gray-100 text-gray-700"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen ? (
        <div className="md:hidden border-t border-gray-100 bg-white">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-gray-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium">{t("navbar.logout")}</span>
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
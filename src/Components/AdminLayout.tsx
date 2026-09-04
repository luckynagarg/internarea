import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  LayoutDashboard,
  Mail,
  Briefcase,
  Users,
  BarChart,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { ADMIN_SESSION_TOKEN_KEY, clearAuthStorage } from "@/lib/authStorage";

/**
 * Shared Admin Layout.
 *
 * Guards every admin panel page:
 *  - If no admin session token exists, redirect to /adminlogin.
 *  - Renders an admin sidebar with links to real, valid admin routes.
 *  - Provides an admin logout that clears the session token.
 *
 * The actual authorization is RE-verified server-side on every API call by
 * the /admin middleware chain; this guard only handles navigation UX.
 */

const NAV_ITEMS: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { href: "/adminpanel", label: "Dashboard", icon: LayoutDashboard },
  { href: "/adminpanel/applications", label: "Applications", icon: Mail },
  { href: "/adminpanel/jobs", label: "Jobs", icon: Briefcase },
  { href: "/adminpanel/internships", label: "Internships", icon: Briefcase },
  { href: "/adminpanel/users", label: "Manage Users", icon: Users },
  { href: "/adminpanel/analytics", label: "Analytics", icon: BarChart },
  { href: "/adminpanel/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ADMIN_SESSION_TOKEN_KEY)
        : null;
    if (!token) {
      router.replace("/adminlogin");
      return;
    }
    setAuthed(true);
  }, [router]);

  const handleLogout = () => {
    clearAuthStorage();
    router.replace("/adminlogin");
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500">Checking admin session…</div>
      </div>
    );
  }

  const sidebar = (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      <div className="px-5 py-5 border-b border-gray-700">
        <div className="text-xl font-bold text-blue-400">InternArea</div>
        <div className="text-xs text-gray-400 mt-1">Admin Panel</div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = router.pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-gray-700">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-gray-800"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {/* Mobile topbar */}
      <header className="lg:hidden sticky top-0 z-40 bg-gray-900 text-white flex items-center justify-between px-4 py-3">
        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 rounded-md hover:bg-gray-800"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <div className="font-bold text-blue-400">InternArea Admin</div>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Logout"
          className="p-2 rounded-md hover:bg-gray-800 text-red-400"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-20 bg-gray-900 text-white">
          {sidebar}
        </div>
      )}

      <main className="lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
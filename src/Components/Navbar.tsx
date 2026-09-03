import React, { useState, useEffect, useMemo, useRef } from "react";
import axiosClient from "@/lib/apiClient";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { Bell, Search, Globe, Menu, X, Shield, MessageSquare } from "lucide-react";
import { signOut } from "firebase/auth";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import NotificationDropdown from "./NotificationDropdown";
import FrenchOtpModal from "./FrenchOtpModal";
import { useRouter } from "next/router";
import { useGlobalSearchSuggestions } from "@/hooks/useGlobalSearchSuggestions";
import { useT, LANG_LABELS, type SupportedLang } from "@/i18n/runtime";
import { toast } from "react-toastify";
import { getFrenchOtpStatus } from "@/Feature/frenchOtp";
import { resetAuthData } from "@/lib/authStorage";

function GlobalSearchBox() {
  const router = useRouter();
  const { t } = useT();
  const [term, setTerm] = React.useState("");
  const { loading, error, suggestions } = useGlobalSearchSuggestions(term);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = React.useState(false);

  const showDropdown = useMemo(() => {
    const q = term.trim();
    return open && !!q && (loading || suggestions.length > 0 || !!error);
  }, [error, loading, open, suggestions.length, term]);

  function submit(q: string) {
    const query = q.trim();
    if (!query) return;
    setOpen(false);
    router.replace(`/search?query=${encodeURIComponent(query)}`);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={term}
        placeholder={t('navbar.searchPlaceholder')}
        className="ml-2 bg-transparent focus:outline-none text-sm w-56 text-foreground placeholder:text-muted-foreground"
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit(term);
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {showDropdown ? (
        <div className="absolute left-0 top-10 z-50 w-72 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {loading ? t('common.searching') : t('common.suggestions')}
          </div>
          {suggestions.length === 0 && !loading ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">{t('common.noResults')}</div>
          ) : null}
          <ul>
            {suggestions.map((s) => (
              <li key={`${s.type}-${s.id}`}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent flex flex-col"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => submit(term)}
                >
                  <span className="text-sm font-medium text-foreground">{s.title}</span>
                  {s.subtitle ? (
                    <span className="text-xs text-muted-foreground">{s.subtitle}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

const Navbar = () => {
  const router = useRouter();
  const user = useSelector(selectuser);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { t, lang, setLang } = useT();
  const [langOpen, setLangOpen] = useState(false);
  const [frenchOtpOpen, setFrenchOtpOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [planName, setPlanName] = useState<string>("");
  const langRef = useRef<HTMLDivElement>(null);

  // Fetch unread notification count on mount / whenever dropdown state changes.
  useEffect(() => {
    let mounted = true;
    async function loadUnread() {
      if (!user) return;
      try {
        const res = await axiosClient.get("/api/notifications/unread-count");
        if (mounted) setUnreadCount(res?.data?.unreadCount ?? 0);
      } catch {
        // ignore; badge stays at 0
      }
    }
    loadUnread();
    return () => {
      mounted = false;
    };
  }, [user, notifOpen]);

  useEffect(() => {
    let mounted = true;
    async function loadPlan() {
      if (!user?.uid) return;
      try {
        const res = await axiosClient.get("/api/subscription/me");
        const data = res?.data?.data;
        if (mounted && data?.planName) setPlanName(data.planName);
      } catch {
        // ignore
      }
    }
    loadPlan();
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  // Intercept language selection. French requires OTP verification first.
  const handleSelectLang = async (l: SupportedLang) => {
    if (l === "fr") {
      setLangOpen(false);
      if (!user) {
        toast.error(t('common.loginRequired'));
        return;
      }
      // Validate against the backend first: if the user already verified
      // French via OTP, allow switching directly. Otherwise require OTP.
      try {
        const status = await getFrenchOtpStatus();
        if (status.ok && status.verified) {
          setLang("fr");
          return;
        }
      } catch {
        // fall through to OTP flow
      }
      setFrenchOtpOpen(true);
      return;
    }
    setLang(l);
    setLangOpen(false);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlelogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore signOut errors — still clear local state below
    }
    // Full auth reset: clear stored email/session/auth data from storage.
    resetAuthData();
    router.push("/login");
  };

  return (
    <div className="relative">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
<div className="flex-shrink-0">
              <a href="/" className="text-xl font-bold text-blue-600">
                <img src={"/logo.png"} alt="" className="h-16" />
              </a>
            </div>

            <button
              type="button"
              className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={t('navbar.toggleMenu')}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div className="hidden md:flex items-center space-x-8">
              <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-600">
                <Link href={"/internship"}><span>{t('navbar.internships')}</span></Link>
              </button>
              <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-600">
                <Link href={"/job"}><span>{t('navbar.jobs')}</span></Link>
              </button>
              <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-600">
                <Link href={"/public"}><span>{t('navbar.publicSpace')}</span></Link>
              </button>
              <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-600">
                <Link href={"/friends"}><span>{t('navbar.friends')}</span></Link>
              </button>
              <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
                <Search size={16} className="text-gray-400" />
                <GlobalSearchBox />
              </div>

              <div className="flex items-center space-x-4">
                <div className="relative" ref={langRef}>
                  <button
                    type="button"
                    className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 p-2 rounded-full hover:bg-gray-100"
                    onClick={() => setLangOpen((v) => !v)}
                    aria-label={t('navbar.language')}
                  >
                    <Globe size={18} />
                    <span className="text-xs font-medium hidden md:inline">{lang.toUpperCase()}</span>
                  </button>
                  {langOpen && (
                    <div className="absolute right-0 top-10 z-50 w-44 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      <div className="px-3 py-2 text-xs text-gray-500 font-medium border-b border-gray-100">
                        {t('navbar.language')}
                      </div>
                      {(Object.keys(LANG_LABELS) as SupportedLang[]).map((l) => (
                        <button
                          key={l}
                          type="button"
className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center justify-between ${lang === l ? 'text-blue-600 font-medium' : 'text-gray-700'}`}
                          onClick={() => handleSelectLang(l)}
                        >
                          <span>{LANG_LABELS[l]}</span>
                          {lang === l && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                 {user ? (
                   <>
                     {planName && (
                       <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                         <Shield size={12} /> {planName}
                       </span>
                     )}
                     <div className="relative">
                      <button
                        type="button"
                        className="relative p-2 rounded-full hover:bg-gray-100"
                        onClick={() => setNotifOpen((v) => !v)}
                        aria-label={t('navbar.openNotifications')}
                      >
                        <Bell size={18} className="text-gray-700" />
                        {unreadCount > 0 && (
                          <span className="absolute top-0 right-0 block min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-4 text-center">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </button>
{notifOpen ? (
<NotificationDropdown
                           open={notifOpen}
                           onClose={() => setNotifOpen(false)}
                           onUnreadChange={setUnreadCount}
                         />
                       ) : null}
                     </div>
                     <div className="relative flex items-center space-x-2">
                       <Link href={"/profile"}>
                         <img src={user.photo} alt="" className="w-8 h-8 rounded-full cursor-pointer" />
                       </Link>
                       <div className="flex flex-col">
                         <Link href="/dashboard" className="text-xs text-gray-600 hover:text-blue-600">{t('dashboard.title')}</Link>
                         <Link href="/messages" className="text-xs text-gray-600 hover:text-blue-600">{t('navbar.messages')}</Link>
                         <button className="text-xs text-red-500 hover:text-red-700 text-left" onClick={handlelogout}>
                           {t('navbar.logout')}
                         </button>
                       </div>
                     </div>
                   </>
                 ) : (
                   <>
                     <Link
                       href="/login"
                       className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                     >
                       {t('navbar.login')}
                     </Link>
                     <a href="/adminlogin" className="text-gray-600 hover:text-gray-800 text-sm">
                       {t('navbar.admin')}
                     </a>
                   </>
                 )}
               </div>
             </div>
</div>
</div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen ? (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-md">
          <div className="px-4 py-3 space-y-1">
            <Link href="/internship" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
              {t('navbar.internships')}
            </Link>
            <Link href="/job" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
              {t('navbar.jobs')}
            </Link>
            <Link href="/public" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
              {t('navbar.publicSpace')}
            </Link>
            <Link href="/friends" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
              {t('navbar.friends')}
            </Link>
            <Link href="/search" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
              {t('navbar.search')}
            </Link>
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
                  {t('dashboard.title')}
                </Link>
                <Link href="/messages" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
                  {t('navbar.messages')}
                </Link>
                <Link href="/profile" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
                  {t('navbar.profile')}
                </Link>
                <Link href="/notifications" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
                  {t('navbar.notifications')}
                </Link>
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); handlelogout(); }}
                  className="w-full text-left px-3 py-2 rounded-md text-red-500 hover:bg-gray-100"
                >
                  {t('navbar.logout')}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-blue-600 hover:bg-gray-100">
                  {t('navbar.login')}
                </Link>
                <Link href="/adminlogin" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100">
                  {t('navbar.admin')}
                </Link>
              </>
            )}
          </div>
        </div>
      ) : null}

      <FrenchOtpModal
        isOpen={frenchOtpOpen}
        onClose={() => setFrenchOtpOpen(false)}
        onVerified={() => {
          setLang("fr");
          setFrenchOtpOpen(false);
        }}
      />
    </div>
  );
};

export default Navbar;

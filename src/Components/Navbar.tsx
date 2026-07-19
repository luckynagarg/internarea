import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { auth, provider } from "../firebase/firebase";
import { Bell, Search } from "lucide-react";
import { signInWithPopup, signOut } from "firebase/auth";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import NotificationDropdown from "./NotificationDropdown";
import { useRouter } from "next/router";
import { useGlobalSearchSuggestions } from "@/hooks/useGlobalSearchSuggestions";


function GlobalSearchBox() {
  const router = useRouter();
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
    // Use replace to prevent keeping broken history entries
    router.replace(`/search?query=${encodeURIComponent(query)}`);
  }


  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={term}
        placeholder="Search opportunities..."
        className="ml-2 bg-transparent focus:outline-none text-sm w-56 text-foreground placeholder:text-muted-foreground"
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // allow click on suggestions
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
            {loading ? "Searching…" : "Suggestions"}
          </div>


          {suggestions.length === 0 && !loading ? (
            <div className="px-3 py-3 text-sm text-muted-foreground">No results</div>
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
                  <span className="text-sm font-medium text-foreground">
                    {s.title}
                  </span>
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

  const user = useSelector(selectuser);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifItems, setNotifItems] = useState<any[]>([]);


  const handlelogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      toast.success("logged in successfully");
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      toast.error(
        error?.message ||
          error?.code ||
          "Google login failed. Check console for details."
      );
    }

    // setuser({
    //   name: "Rahul",
    //   email: "xyz@gmail.com",
    //   photo:
    //     "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=faces",
    // });
  };
  const handlelogout = () => {
    signOut(auth);
  };
  return (
    <div className="relative">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex-shrink-0">
              <a href="/" className="text-xl font-bold text-blue-600">
                <img src={"/logo.png"} alt="" className="h-16" />
              </a>
            </div>
            {/* Navigation Links */}
              <div className="hidden md:flex items-center space-x-8">
              <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-600">

                <Link href={"/internship"}>
                  <span>Internships</span>
                </Link>
              </button>
              <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-600">
                <Link href={"/job"}>
                  <span>Jobs</span>
                </Link>
              </button>
              <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-600">
                <Link href={"/public"}>
                  <span>Public Space</span>
                </Link>
              </button>

              <button className="flex items-center space-x-1 text-gray-700 hover:text-blue-600">
                <Link href={"/friends"}>
                  <span>Friends</span>
                </Link>
              </button>

              <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">

                <Search size={16} className="text-gray-400" />
                <GlobalSearchBox />

              </div>

            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  {/* Notification bell */}
                  <div className="relative">
                    <button
                      type="button"
                      className="relative p-2 rounded-full hover:bg-gray-100"
                      onClick={() => setNotifOpen((v) => !v)}
                      aria-label="Open notifications"
                    >
                      <Bell size={18} className="text-gray-700" />
                      {/* dot */}
                      <span className="absolute top-1 right-2 block w-2 h-2 rounded-full bg-red-500" />
                    </button>
                    {notifOpen ? (
                      <NotificationDropdown
                        open={notifOpen}
                        onClose={() => setNotifOpen(false)}
                        onMarkRead={(items) => setNotifItems(items)}
                      />
                    ) : null}
                  </div>

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
                </>
              ) : (
                <>
                  <button
                    onClick={handlelogin}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 flex items-center justify-center space-x-2 hover:bg-gray-50 "
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
                    <span className="text-gray-700">Continue with google</span>
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
          </div>{" "}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;

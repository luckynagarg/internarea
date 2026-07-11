import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { mockData, MockNotification, MockUser } from "@/mockData";
import { fetchOrMock } from "@/mockData/fetchOrMock";
import NotificationDropdown from "@/Components/NotificationDropdown";
import {
  Bell,
  MessageSquare,
  Users,
  BriefcaseBusiness,
  Building2,
  Bookmark,
} from "lucide-react";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";


const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

export default function DashboardPage() {
  const user = useSelector(selectuser) as MockUser | null;

  // If user isn’t in redux state yet, don’t crash.
  // Access control will be handled by redirect logic in /dashboard routing later.
  const safeUser = user ?? ({} as MockUser);


  const [notificationOpen, setNotificationOpen] = useState(false);
  const bellButtonRef = useRef<HTMLButtonElement | null>(null);

  // close on outside click
  useEffect(() => {
    if (!notificationOpen) return;

    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const btn = bellButtonRef.current;
      if (btn && btn.contains(target)) return;

      // dropdown is rendered with absolute/fixed; safest is to always close if click happens outside button.
      setNotificationOpen(false);
    };

    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [notificationOpen]);

  // Right sidebar widgets: use mock by default; fallback to API if available.
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<MockNotification[]>([]);
  const [onlineFriends, setOnlineFriends] = useState<MockUser[]>([]);
  const [suggestedConnections, setSuggestedConnections] = useState<MockUser[]>([]);

  useEffect(() => {
    if (!user?.uid) return;


    let mounted = true;

    async function load() {
      const [reqs, notifs] = await Promise.all([
        fetchOrMock<any[]>({
          url: `${API_BASE}/api/friends/requests?userId=${encodeURIComponent((user ?? safeUser)?.uid ?? "")}`, 
          mock: () => mockData.friendRequests,
          transform: (d) => d?.data ?? d?.requests ?? d ?? [],
        }),
        fetchOrMock<MockNotification[]>({
          url: `${API_BASE}/api/notifications?userId=${encodeURIComponent((user ?? safeUser)?.uid ?? "")}`,
          mock: () => mockData.notifications,
          transform: (d) =>
            d?.data?.notifications ??
            d?.data ??
            d?.notifications ??
            d ??
            [],
        }),
      ]);



      if (!mounted) return;

      setFriendRequests(Array.isArray(reqs) ? reqs.slice(0, 8) : []);

      const normalizedNotifs = Array.isArray(notifs) ? notifs : [];
      setRecentNotifications(normalizedNotifs.slice(0, 8));

      // mock online/suggestions (backend not guaranteed in this snapshot)
      setOnlineFriends(mockData.users.slice(2, 7));
      setSuggestedConnections(mockData.users.slice(7, 15));
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user?.uid]);

  const unreadCount = useMemo(
    () => recentNotifications.filter((x) => !x.read).length,
    [recentNotifications]
  );

  // Center feed: ensure it never looks empty.
  // mockData schema in this repo doesn’t include jobs/publicPosts.
  // Use safe fallbacks so dashboard never looks empty.
  const recommendedJobs = useMemo(() => mockData.posts?.slice(0, 6) ?? [], []);
  const recommendedInternships = useMemo(
    () => mockData.internships?.slice(0, 6) ?? [],
    []
  );


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xl font-bold text-blue-600">
                <img src="/logo.png" alt="" className="h-10 w-auto" />
              </Link>
              <div className="hidden md:block">
                <div className="text-sm text-gray-600">Welcome{user?.name ? `, ${user.name}` : ""}</div>
                <div className="text-lg font-semibold text-gray-900">Dashboard</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center bg-gray-100 rounded-full px-4 py-2">
                <span className="text-gray-500 text-sm">Search…</span>
              </div>

              <button
                ref={bellButtonRef}
                className="relative p-2 rounded-full hover:bg-gray-100"
                aria-label="Open notifications"
                onClick={() => setNotificationOpen((s) => !s)}
              >
                <Bell className="w-5 h-5 text-gray-700" />
                {unreadCount > 0 ? (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full text-[10px] px-1.5 py-0.5 font-bold">
                    {unreadCount}
                  </span>
                ) : null}
              </button>

              <Link href="/chat" className="p-2 rounded-full hover:bg-gray-100" aria-label="Open chat">
                <MessageSquare className="w-5 h-5 text-gray-700" />
              </Link>

              <Link href="/friends" className="p-2 rounded-full hover:bg-gray-100" aria-label="Open friends">
                <Users className="w-5 h-5 text-gray-700" />
              </Link>

              <Link href="/profile" className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded-lg">
                {user?.photo ? (
                  <img src={user.photo} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-200" />
                )}
              </Link>
            </div>
          </div>

          {/* Dropdown rendered under navbar */}
          <NotificationDropdown
            open={notificationOpen}
            onClose={() => setNotificationOpen(false)}
            onMarkRead={() => {
              // handled inside dropdown visual optimistic update; right sidebar uses its own data.
            }}
          />
        </div>
      </header>

      {/* Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left sidebar */}
          <aside className="lg:col-span-2 hidden md:block">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-20">
              <nav className="space-y-2">
                <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
                  <span className="font-medium">Home</span>
                </Link>
                <Link href="/friends" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">Friends</span>
                </Link>
                <Link href="/job" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
                  <BriefcaseBusiness className="w-4 h-4" />
                  <span className="font-medium">Jobs</span>
                </Link>
                <Link href="/internship" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium">Internships</span>
                </Link>
                <Link href="/public" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Bookmark className="w-4 h-4" />
                  <span className="font-medium">Saved Jobs</span>
                </Link>
                <Link href="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
                  <span className="font-medium">Profile</span>
                </Link>
              </nav>
            </div>
          </aside>

          {/* Center feed */}
          <main className="lg:col-span-7 space-y-6">
            <section className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Public Posts</h2>
              <div className="space-y-3">
                {(mockData.posts?.slice(0, 4) ?? []).map((p: any) => (
                  <div key={p._id ?? p.id} className="border rounded-lg p-4">
                    <div className="font-semibold text-gray-900">
                      {p.caption ? "Post" : "Post"}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {p.caption ?? p.body ?? p.message ?? ""}
                    </div>
                  </div>
                ))}
                {(!mockData.posts || mockData.posts.length === 0) && (
                  <div className="text-sm text-gray-500">No posts found.</div>
                )}

              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Recommended Jobs</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {(recommendedJobs ?? []).map((j: any) => (
                  <Link key={j._id ?? j.id ?? Math.random()} href={`/detailjob/${j._id ?? j.id}`} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="font-semibold text-gray-900">{j.title ?? "Job"}</div>
                    <div className="text-sm text-gray-600">{j.company ?? ""}</div>
                    <div className="text-xs text-gray-500 mt-2">{j.location ?? ""}</div>
                  </Link>
                ))}
                {(!recommendedJobs || recommendedJobs.length === 0) && (
                  <div className="sm:col-span-2 text-sm text-gray-500">No jobs available.</div>
                )}
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Recommended Internships</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {(recommendedInternships ?? []).map((it: any) => (
                  <Link key={it._id ?? it.id ?? Math.random()} href={`/detailiternship/${it._id ?? it.id}`} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="font-semibold text-gray-900">{it.title ?? "Internship"}</div>
                    <div className="text-sm text-gray-600">{it.company ?? ""}</div>
                    <div className="text-xs text-gray-500 mt-2">{it.location ?? ""}</div>
                  </Link>
                ))}
                {(!recommendedInternships || recommendedInternships.length === 0) && (
                  <div className="sm:col-span-2 text-sm text-gray-500">No internships available.</div>
                )}
              </div>
            </section>
          </main>

          {/* Right sidebar */}
          <aside className="lg:col-span-3 space-y-6 hidden lg:block">
            <div className="space-y-4">
              <section className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Friend Requests
                </h2>
                <div className="space-y-3">
                  {(friendRequests ?? []).slice(0, 5).map((r: any) => {
                    const otherId =
                      r.senderId === safeUser?.uid
                        ? r.receiverId
                        : r.senderId;
                    const other = mockData.users.find((u) => u.uid === otherId);
                    return (
                      <div
                        key={r._id ?? r.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={other?.photo}
                            alt={other?.name}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {other?.name ?? "User"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {(r.status ?? "pending").toUpperCase()}
                            </div>
                          </div>
                        </div>
                        <Link
                          href="/friends"
                          className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                          View
                        </Link>
                      </div>
                    );
                  })}
                  {(friendRequests ?? []).length === 0 && (
                    <div className="text-sm text-gray-500">No pending requests.</div>
                  )}
                </div>
                <div className="mt-3">
                  <Link
                    href="/friends"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Go to friends
                  </Link>
                </div>
              </section>


              <section className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Notifications</h2>
                <div className="space-y-3">
                  {(recentNotifications ?? []).slice(0, 6).map((n) => (
                    <div
                      key={n._id}
                      className={`border rounded-lg p-3 ${
                        n.read ? "bg-white" : "bg-amber-50"
                      }`}
                    >
                      <div className="text-sm font-semibold text-gray-900">
                        {n.title || "Notification"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {(n as any).body ?? n.message ?? ""}
                      </div>
                    </div>
                  ))}

                  {(recentNotifications ?? []).length === 0 && (
                    <div className="text-sm text-gray-500">No notifications yet.</div>
                  )}
                </div>
                <div className="mt-3">
                  <Link href="/notifications" className="text-sm text-blue-600 hover:text-blue-700">See all</Link>
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Online Friends</h2>
                <div className="flex flex-wrap gap-3">
                  {(onlineFriends ?? []).slice(0, 8).map((u) => (
                    <Link key={u.uid} href="/friends" className="flex items-center gap-2">
                      <img src={u.photo} alt={u.name} className="w-9 h-9 rounded-full object-cover" />
                    </Link>
                  ))}
                  {(onlineFriends ?? []).length === 0 && (
                    <div className="text-sm text-gray-500">No online friends.</div>
                  )}
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Suggested Connections</h2>
                <div className="space-y-3">
                  {(suggestedConnections ?? []).slice(0, 6).map((u) => (
                    <div key={u.uid} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={u.photo} alt={u.name} className="w-9 h-9 rounded-full object-cover" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{u.name}</div>
                          <div className="text-xs text-gray-500 truncate">{u.headline ?? ""}</div>
                        </div>
                      </div>
                      <button className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200">
                        Connect
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}


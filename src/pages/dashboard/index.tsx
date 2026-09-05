import { useEffect, useState } from "react";
import Link from "next/link";
import axiosClient from "@/lib/apiClient";
import {
  BriefcaseBusiness,
  Building2,
  Bookmark,
  Users,
  ArrowRight,
} from "lucide-react";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import { useT } from '@/i18n/runtime';
import FriendCard, { FriendCardModel } from "@/pages/friends/components/FriendCard";
import { toast } from "react-toastify";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function DashboardPage() {
  const { ready } = useRequireAuth();
  const user = useSelector(selectuser) as any;
  const { t } = useT();

  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [onlineFriends, setOnlineFriends] = useState<any[]>([]);
  const [suggestedConnections, setSuggestedConnections] = useState<any[]>([]);
  const [pendingSent, setPendingSent] = useState<Set<string>>(new Set());
  const [actionUid, setActionUid] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [internships, setInternships] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      // Public posts (unauthenticated feed)
      try {
        const res = await axiosClient.get("/api/public/posts", { skipAuth: true } as any);
        if (mounted) setPosts(res?.data?.posts ?? []);
      } catch { /* ignore */ }

      // Jobs
      try {
        const res = await axiosClient.get("/api/job", { skipAuth: true } as any);
        const list = res?.data?.data ?? res?.data ?? [];
        if (mounted) setJobs(Array.isArray(list) ? list : []);
      } catch { /* ignore */ }

      // Internships
      try {
        const res = await axiosClient.get("/api/internship", { skipAuth: true } as any);
        const list = res?.data?.data ?? res?.data ?? [];
        if (mounted) setInternships(Array.isArray(list) ? list : []);
      } catch { /* ignore */ }

      if (!user?.uid) return;

      // Friend requests (pending incoming)
      try {
        const res = await axiosClient.get("/api/friends/pending");
        const list = res?.data?.data ?? [];
        if (mounted) setFriendRequests(Array.isArray(list) ? list : []);
      } catch { /* ignore */ }

      // Notifications
      try {
        const res = await axiosClient.get("/api/notifications?limit=10");
        const list = res?.data?.notifications ?? [];
        if (mounted) setRecentNotifications(Array.isArray(list) ? list : []);
      } catch { /* ignore */ }

// Friends list
      try {
        const res = await axiosClient.get("/api/friends/list");
        const list = res?.data?.data ?? [];
        if (mounted) setOnlineFriends(Array.isArray(list) ? list.slice(0, 8) : []);
      } catch { /* ignore */ }

      // Suggested connections (users you are not friends with yet)
      try {
        const res = await axiosClient.get("/api/users/suggestions?limit=10");
        const list = res?.data?.data ?? [];
        if (mounted) setSuggestedConnections(Array.isArray(list) ? list : []);
      } catch { /* ignore */ }

      if (user?.uid) {
        try {
          setSubscriptionLoading(true);
          const res = await axiosClient.get("/api/subscription/me");
          if (mounted) setSubscription(res?.data?.data || null);
        } catch { /* ignore */ }
        finally {
          if (mounted) setSubscriptionLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
   }, [user?.uid]);

  const handleConnect = async (target: any) => {
    const uid = target.uid || target._id;
    if (!uid || pendingSent.has(uid)) return;
    setActionUid(uid);
    setPendingSent((prev) => new Set(prev).add(uid));
    try {
      await axiosClient.post('/api/friends/request', { receiver: uid });
      toast.success(t('common.addFriend'));
      setSuggestedConnections((prev) =>
        prev.map((u) => (u.uid === uid || u._id === uid ? { ...u, relationship: 'request_sent' } : u))
      );
    } catch (e: any) {
      setPendingSent((prev) => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
      toast.error(e?.response?.data?.message || e?.message || t('common.error'));
    } finally {
      setActionUid(null);
    }
  };

  const handleCancelRequest = async (target: any) => {
    const uid = target.uid || target._id;
    if (!uid) return;
    setActionUid(uid);
    try {
      await axiosClient.post('/api/friends/cancel', { receiver: uid });
      toast.success(t('common.cancelRequest'));
      setPendingSent((prev) => {
        const next = new Set(prev);
        next.delete(uid);
        return next;
      });
      setSuggestedConnections((prev) =>
        prev.map((u) => (u.uid === uid || u._id === uid ? { ...u, relationship: 'none' } : u))
      );
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || t('common.error'));
    } finally {
      setActionUid(null);
    }
  };


  if (!ready) return null;
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-2 hidden md:block">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-20">
              <nav className="space-y-2">
                <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
                  <span className="font-medium">{t('dashboard.nav.home')}</span>
                </Link>
                <Link href="/friends" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">{t('dashboard.nav.friends')}</span>
                </Link>
                <Link href="/job" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
                  <BriefcaseBusiness className="w-4 h-4" />
                  <span className="font-medium">{t('dashboard.nav.jobs')}</span>
                </Link>
                <Link href="/internship" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium">{t('dashboard.nav.internships')}</span>
                </Link>
                <Link href="/public" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
                  <Bookmark className="w-4 h-4" />
                  <span className="font-medium">{t('dashboard.nav.publicSpace')}</span>
                </Link>
                <Link href="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700">
                  <span className="font-medium">{t('dashboard.nav.profile')}</span>
                </Link>
              </nav>
            </div>
          </aside>

          <main className="lg:col-span-7 space-y-6">
            {subscription && (
              <section className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.yourPlan')}</h2>
                  <Link href="/subscription" className="text-sm text-blue-700 hover:text-blue-800 font-medium inline-flex items-center gap-1">
                    {t('dashboard.manage')} <ArrowRight size={14} />
                  </Link>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500">{t('dashboard.currentPlan')}</div>
                    <div className="text-xl font-bold text-gray-900">{subscription.planName}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        subscription.subscriptionStatus === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {t(`status.${subscription.subscriptionStatus}`)}
                      </span>
                      <span>• {subscription.monthlyLimit === Number.POSITIVE_INFINITY ? t('dashboard.unlimited') : `${subscription.monthlyLimit} / ${t('subscription.monthlyLimit')}`}</span>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-sm text-gray-500">{t('dashboard.daysRemaining')}</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {subscription.subscriptionExpiry
                        ? Math.max(0, Math.ceil((new Date(subscription.subscriptionExpiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
                        : 0}
                    </div>
                    <div className="text-sm text-gray-600">
                      {subscription.subscriptionExpiry ? `${t('dashboard.until')} ${new Date(subscription.subscriptionExpiry).toDateString()}` : '—'}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>{t('dashboard.applicationsUsed')}: <span className="font-semibold text-gray-900">{subscription.applicationsUsed ?? 0}</span></span>
                    <span>{t('dashboard.remaining')}: <span className="font-semibold text-gray-900">{subscription.remainingApplications ?? 0}</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600"
                      style={{
                        width: `${subscription.monthlyLimit && subscription.monthlyLimit !== Number.POSITIVE_INFINITY ? Math.max(0, Math.min(100, ((subscription.applicationsUsed || 0) / subscription.monthlyLimit) * 100)) : 100}%`,
                      }}
                    />
                  </div>
                </div>
              </section>
            )}

            <section className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('dashboard.publicPosts')}</h2>
              <div className="space-y-3">
                {(posts ?? []).slice(0, 4).map((p: any) => (
                  <div key={p._id ?? p.id} className="border rounded-lg p-4">
                    <div className="font-semibold text-gray-900">
                      {p.author?.name ?? t('dashboard.postFallback')}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {p.caption ?? p.body ?? p.message ?? ""}
                    </div>
                  </div>
                ))}
                {(!posts || posts.length === 0) && (
                  <div className="text-sm text-gray-500">{t('dashboard.noPosts')}</div>
                )}
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('dashboard.recommendedJobs')}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {(jobs ?? []).slice(0, 6).map((j: any) => (
                  <Link key={j._id} href={`/detailjob/${j._id}`} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="font-semibold text-gray-900">{j.title ?? t('dashboard.jobFallback')}</div>
                    <div className="text-sm text-gray-600">{j.company ?? ""}</div>
                    <div className="text-xs text-gray-500 mt-2">{j.location ?? ""}</div>
                  </Link>
                ))}
                {(!jobs || jobs.length === 0) && (
                  <div className="sm:col-span-2 text-sm text-gray-500">{t('dashboard.noJobs')}</div>
                )}
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('dashboard.recommendedInternships')}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {(internships ?? []).slice(0, 6).map((it: any) => (
                  <Link key={it._id} href={`/detailinternship/${it._id}`} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="font-semibold text-gray-900">{it.title ?? t('dashboard.internshipFallback')}</div>
                    <div className="text-sm text-gray-600">{it.company ?? ""}</div>
                    <div className="text-xs text-gray-500 mt-2">{it.location ?? ""}</div>
                  </Link>
                ))}
                {(!internships || internships.length === 0) && (
                  <div className="sm:col-span-2 text-sm text-gray-500">{t('dashboard.noInternships')}</div>
                )}
              </div>
            </section>
          </main>

          <aside className="lg:col-span-3 space-y-6 hidden lg:block">
            <div className="space-y-4">
              <section className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('dashboard.friendRequests')}</h2>
                <div className="space-y-3">
                  {(friendRequests ?? []).slice(0, 5).map((r: any) => (
                    <div key={r._id ?? r.requestId} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={r.sender?.photo}
                          alt={r.sender?.name}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {r.sender?.name ?? t('dashboard.userFallback')}
                          </div>
                          <div className="text-xs text-gray-500">{t('dashboard.pending')}</div>
                        </div>
                      </div>
                      <Link href="/friends" className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">
                        {t('dashboard.view')}
                      </Link>
                    </div>
                  ))}
                  {(friendRequests ?? []).length === 0 && (
                    <div className="text-sm text-gray-500">{t('dashboard.noPendingRequests')}</div>
                  )}
                </div>
                <div className="mt-3">
                  <Link href="/friends" className="text-sm text-blue-600 hover:text-blue-700">{t('dashboard.viewFriends')}</Link>
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('dashboard.recentNotifications')}</h2>
                <div className="space-y-3">
                  {(recentNotifications ?? []).slice(0, 6).map((n) => (
                    <div key={n._id} className={`border rounded-lg p-3 ${n.read ? "bg-white" : "bg-amber-50"}`}>
                      <div className="text-sm font-semibold text-gray-900">{n.title || t('notifications.notificationFallback')}</div>
                      <div className="text-xs text-gray-500 mt-1">{n.body ?? n.message ?? ""}</div>
                    </div>
                  ))}
                  {(recentNotifications ?? []).length === 0 && (
                    <div className="text-sm text-gray-500">{t('dashboard.noNotifications')}</div>
                  )}
                </div>
                <div className="mt-3">
                  <Link href="/notifications" className="text-sm text-blue-600 hover:text-blue-700">{t('dashboard.seeAll')}</Link>
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('dashboard.friends')}</h2>
                <div className="flex flex-wrap gap-3">
                  {(onlineFriends ?? []).slice(0, 8).map((u) => (
                    <Link key={u.uid ?? u._id} href="/friends" className="flex items-center gap-2">
                      <img src={u.photo} alt={u.name} className="w-9 h-9 rounded-full object-cover" />
                    </Link>
                  ))}
                  {(onlineFriends ?? []).length === 0 && (
                    <div className="text-sm text-gray-500">{t('dashboard.noFriends')}</div>
                  )}
                </div>
              </section>

              <section className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('dashboard.suggestedConnections')}</h2>
                <div className="space-y-3">
                  {(suggestedConnections ?? []).slice(0, 6).map((u) => {
                    const rel = u.relationship || (pendingSent.has(u.uid || u._id) ? 'request_sent' : 'none');
                    const card: FriendCardModel = {
                      _id: String(u._id || u.uid),
                      uid: String(u.uid || u._id),
                      name: u.name ?? null,
                      username: u.username ?? null,
                      nickname: u.nickname ?? null,
                      photo: u.photo ?? null,
                      headline: u.headline ?? null,
                      bio: u.bio ?? null,
                      location: u.location ?? null,
                      mutualFriends: u.mutualFriends ?? 0,
                      friendCount: u.friendCount ?? 0,
                      isFriend: rel === 'friends',
                      relationship: rel as any,
                    };
                    return (
                      <FriendCard
                        key={card.uid}
                        friend={card}
                        onAdd={handleConnect}
                        onCancel={handleCancelRequest}
                        actionLoading={actionUid === card.uid}
                      />
                    );
                  })}
                  {(suggestedConnections ?? []).length === 0 && (
                    <div className="text-sm text-gray-500">{t('dashboard.noSuggestions')}</div>
                  )}
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

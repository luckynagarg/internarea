import { useEffect, useState } from "react";
import Link from "next/link";
import axiosClient from "@/lib/apiClient";
import {
  BriefcaseBusiness,
  Building2,
  Bookmark,
  Users,
  ArrowRight,
  MapPin,
  Banknote,
  Calendar,
  UserPlus,
  Bell,
  ChevronRight,
} from "lucide-react";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import { useT } from '@/i18n/runtime';
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
  const [jobs, setJobs] = useState<any[]>([]);
  const [internships, setInternships] = useState<any[]>([]);

  const timeGreeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  // Profile completion calculated from real profile data fields
  const profileCompletion = (() => {
    const fields = [
      user?.name,
      user?.photo,
      user?.headline,
      user?.bio,
      user?.location,
      user?.education || user?.college || user?.degree,
      user?.skills && (Array.isArray(user.skills) ? user.skills.length > 0 : String(user.skills).trim() !== ""),
      user?.experience,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  })();

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await axiosClient.get("/api/job", { skipAuth: true } as any);
        const list = res?.data?.data ?? res?.data ?? [];
        if (mounted) setJobs(Array.isArray(list) ? list : []);
      } catch { /* ignore */ }

      try {
        const res = await axiosClient.get("/api/internship", { skipAuth: true } as any);
        const list = res?.data?.data ?? res?.data ?? [];
        if (mounted) setInternships(Array.isArray(list) ? list : []);
      } catch { /* ignore */ }

      if (!user?.uid) return;

      try {
        const res = await axiosClient.get("/api/friends/pending");
        const list = res?.data?.data ?? [];
        if (mounted) setFriendRequests(Array.isArray(list) ? list : []);
      } catch { /* ignore */ }

      try {
        const res = await axiosClient.get("/api/notifications?limit=10");
        const list = res?.data?.notifications ?? [];
        if (mounted) setRecentNotifications(Array.isArray(list) ? list : []);
      } catch { /* ignore */ }

      try {
        const res = await axiosClient.get("/api/friends/list");
        const list = res?.data?.data ?? [];
        if (mounted) setOnlineFriends(Array.isArray(list) ? list.slice(0, 8) : []);
      } catch { /* ignore */ }

      try {
        const res = await axiosClient.get("/api/users/suggestions?limit=10");
        const list = res?.data?.data ?? [];
        if (mounted) setSuggestedConnections(Array.isArray(list) ? list : []);
      } catch { /* ignore */ }
    }

    load();
    return () => { mounted = false; };
  }, [user?.uid]);

  const handleConnect = async (target: any) => {
    const uid = target.uid || target._id;
    if (!uid) return;
    setActionUid(uid);
    try {
      await axiosClient.post('/api/friends/request', { receiver: uid });
      toast.success(t('common.addFriend'));
      setPendingSent((prev) => new Set(prev).add(uid));
      setSuggestedConnections((prev) =>
        prev.map((u) => (u.uid === uid || u._id === uid ? { ...u, relationship: 'request_sent' } : u))
      );
    } catch (e: any) {
      setPendingSent((prev) => { const n = new Set(prev); n.delete(uid); return n; });
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
      setPendingSent((prev) => { const n = new Set(prev); n.delete(uid); return n; });
      setSuggestedConnections((prev) =>
        prev.map((u) => (u.uid === uid || u._id === uid ? { ...u, relationship: 'none' } : u))
      );
      toast.success(t('common.cancelRequest'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || t('common.error'));
    } finally {
      setActionUid(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{timeGreeting}, {user?.name || "there"}</h1>
              <p className="text-gray-500 mt-1">Discover opportunities, grow your network, and build your career.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/internship" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                <BriefcaseBusiness className="w-4 h-4" />
                Explore Internships
              </Link>
              <Link href="/job" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                <Building2 className="w-4 h-4" />
                Find Jobs
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/internship" className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
              <BriefcaseBusiness className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900 text-sm">Find Internships</h3>
            <p className="text-xs text-gray-500 mt-1">Explore opportunities</p>
          </Link>
          <Link href="/job" className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-100 transition-colors">
              <Building2 className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-medium text-gray-900 text-sm">Find Jobs</h3>
            <p className="text-xs text-gray-500 mt-1">Discover openings</p>
          </Link>
          <Link href="/friends" className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
              <UserPlus className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-medium text-gray-900 text-sm">Connect</h3>
            <p className="text-xs text-gray-500 mt-1">Grow your network</p>
          </Link>
          <Link href="/public" className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-orange-100 transition-colors">
              <Bookmark className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="font-medium text-gray-900 text-sm">Public Space</h3>
            <p className="text-xs text-gray-500 mt-1">Join discussions</p>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Recommended Opportunities */}
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recommended for you</h2>
                <Link href="/internship" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  View all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {internships.length === 0 && jobs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BriefcaseBusiness className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No opportunities available right now.</p>
                  <p className="text-gray-400 text-xs mt-1">New internships and jobs will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {internships.slice(0, 3).map((item) => (
                    <Link key={item._id} href={`/detailinternship/${item._id}`} className="block border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{item.title}</h3>
                          <p className="text-sm text-gray-500">{item.company}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                            {item.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location}</span>}
                            {item.duration && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{item.duration}</span>}
                            {item.stipend && <span className="flex items-center gap-1"><Banknote className="w-3 h-3" />₹{item.stipend}/month</span>}
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded">Internship</span>
                      </div>
                    </Link>
                  ))}
                  {jobs.slice(0, 2).map((item) => (
                    <Link key={item._id} href={`/detailjob/${item._id}`} className="block border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{item.title}</h3>
                          <p className="text-sm text-gray-500">{item.company}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                            {item.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location}</span>}
                            {item.CTC && <span className="flex items-center gap-1"><Banknote className="w-3 h-3" />₹{item.CTC}</span>}
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-green-50 text-green-600 text-xs font-medium rounded">Job</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Network Section */}
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">People you may know</h2>
                <Link href="/friends" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  Find Friends <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {suggestedConnections.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500 text-sm">Start building your network</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {suggestedConnections.slice(0, 4).map((u) => (
                    <div key={u._id || u.uid} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                      {u.photo ? (
                        <img src={u.photo} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">{(u.name || "U").charAt(0)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{u.name}</p>
                        <p className="text-xs text-gray-500 truncate">{u.headline || ""}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleConnect(u.uid || u._id)}
                        disabled={actionUid === (u.uid || u._id) || pendingSent.has(u.uid || u._id)}
                        className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                      >
                        {pendingSent.has(u.uid || u._id) ? "Sent" : "Connect"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <section className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Complete your profile</h2>
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-500">Profile strength</span>
                  <span className="font-medium text-gray-900">{profileCompletion}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${profileCompletion}%` }} />
                </div>
              </div>
              <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                Complete Profile <ArrowRight className="w-4 h-4" />
              </Link>
            </section>

            <section className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Your activity</h2>
              {friendRequests.length === 0 && recentNotifications.length === 0 ? (
                <p className="text-sm text-gray-500">You're all caught up.</p>
              ) : (
                <div className="space-y-2">
                  {friendRequests.length > 0 && (
                    <Link href="/friends" className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-gray-700">Friend Requests</span>
                      </div>
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{friendRequests.length}</span>
                    </Link>
                  )}
                  {recentNotifications.length > 0 && (
                    <Link href="/notifications" className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700">Notifications</span>
                      </div>
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">{recentNotifications.length}</span>
                    </Link>
                  )}
                </div>
              )}
            </section>

            {onlineFriends.length > 0 && (
              <section className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-900">Friends</h2>
                  <Link href="/friends" className="text-xs text-blue-600 hover:text-blue-700">View all</Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {onlineFriends.slice(0, 8).map((u) => (
                    <Link key={u.uid ?? u._id} href="/friends" title={u.name}>
                      {u.photo ? (
                        <img src={u.photo} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">{(u.name || "U").charAt(0)}</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
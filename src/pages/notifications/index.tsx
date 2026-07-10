import { useEffect, useMemo, useState } from 'react';
import { mockData, MockNotification, MockUser } from '@/mockData';
import { fetchOrMock } from '@/mockData/fetchOrMock';
import { Bell, CheckCircle2, Heart, MessageSquare, FileText } from 'lucide-react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000';

export default function NotificationsPage() {
  const currentUser: MockUser | null = mockData.users[0] ?? null;

  const [items, setItems] = useState<MockNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!currentUser) return;

      const data = await fetchOrMock<MockNotification[]>({
        url: `${API_BASE}/api/notifications?userId=${encodeURIComponent(currentUser.uid)}`,
        mock: () => mockData.notifications,
        transform: (d) => {
          const arr = d?.data?.notifications ?? d?.data ?? d?.notifications ?? d;
          return Array.isArray(arr) ? arr : [];
        },
      });

      if (!mounted) return;
      setItems(data);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  const unreadCount = useMemo(() => items.filter((x) => !x.read).length, [items]);

  const visible = useMemo(() => {
    const base = items.filter((x) => x.userId === currentUser?.uid || true);
    const sorted = [...base].sort((a, b) => +new Date(b.createdAtISO) - +new Date(a.createdAtISO));
    if (filter === 'unread') return sorted.filter((x) => !x.read);
    return sorted;
  }, [items, filter, currentUser]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Bell className="text-blue-600" /> Notifications
            </h1>
            <p className="text-gray-600 mt-1">Unread/read mix with realistic types.</p>
          </div>
          <div className="text-sm font-semibold text-blue-700">{unreadCount} unread</div>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            className={`px-4 py-2 rounded-lg text-sm ${filter === 'unread' ? 'bg-blue-100 text-blue-800 font-semibold' : 'bg-white border'}`}
            onClick={() => setFilter('unread')}
          >
            Unread
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm ${filter === 'all' ? 'bg-blue-100 text-blue-800 font-semibold' : 'bg-white border'}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-5 text-gray-500">Loading notifications...</div>
          ) : (
            visible.map((n) => {
              const icon =
                n.type === 'social' ? <MessageSquare className="text-blue-600" /> : n.type === 'post' ? <Heart className="text-red-600" /> : n.type === 'application' ? <FileText className="text-purple-600" /> : <CheckCircle2 className="text-green-600" />;

              return (
                <div key={n._id} className={`bg-white rounded-xl shadow-sm p-4 flex gap-3 ${!n.read ? 'border border-blue-100' : ''}`}>
                  <div className="mt-1">{icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-gray-900">{n.title}</div>
                      <div className={`text-xs ${n.read ? 'text-gray-400' : 'text-blue-600 font-semibold'}`}>
                        {new Date(n.createdAtISO).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-gray-600 text-sm mt-1">{n.message}</div>
                    <div className="text-xs text-gray-500 mt-2">Type: {n.type}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}


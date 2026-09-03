import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectuser } from '@/Feature/Userslice';
import axiosClient from '@/lib/apiClient';
import { useRouter } from 'next/router';
import { useT } from '@/i18n/runtime';
import { toast } from 'react-toastify';
import { useRequireAuth } from '@/hooks/useRequireAuth';

import { Bell, CheckCircle2, Heart, MessageSquare, FileText, Inbox, Check, X } from 'lucide-react';

interface NotificationItem {
  _id: string;
  title?: string;
  body?: string;
  message?: string;
  type?: string;
  read?: boolean;
  createdAt?: string | null;
  createdAtISO?: string | null;
  link?: string | null;
  action?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

export default function NotificationsPage() {
  const user = useSelector(selectuser) as any;
  const router = useRouter();
  const { t } = useT();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  async function load() {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get('/api/notifications');
      const arr = res?.data?.notifications ?? res?.data?.data ?? res?.data ?? [];
      setItems(Array.isArray(arr) ? arr : []);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const unreadCount = useMemo(() => items.filter((x) => !x.read).length, [items]);

  const visible = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => +new Date(b.createdAt ?? b.createdAtISO ?? 0) - +new Date(a.createdAt ?? a.createdAtISO ?? 0)
    );
    if (filter === 'unread') return sorted.filter((x) => !x.read);
    return sorted;
  }, [items, filter]);

  async function markRead(n: NotificationItem) {
    if (!n?._id) return;
    try {
      await axiosClient.post(`/api/notifications/${n._id}/read`);
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      if (n.link) router.push(n.link);
    } catch {
      // ignore read-state update errors
    }
  }

  async function handleFriendRequestAction(notification: NotificationItem, action: 'accept' | 'reject') {
    if (!notification.entityId) return;
    const requestId = notification.entityId;
    const senderUid = (notification as any).fromUser;
    setActionId(requestId);
    try {
      if (action === 'accept') {
        await axiosClient.post('/api/friends/accept', { requestId, sender: senderUid });
      } else {
        await axiosClient.post('/api/friends/reject', { requestId, sender: senderUid });
      }
      setItems((prev) => prev.filter((x) => x._id !== notification._id));
      toast.success(action === 'accept' ? t('common.accept') : t('common.reject'));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || t('common.error'));
    } finally {
      setActionId(null);
    }
  }

  const iconFor = (type?: string) => {
    if (type === 'social') return <MessageSquare className="text-blue-600" />;
    if (type === 'post' || type === 'post_like' || type === 'post_comment') return <Heart className="text-red-600" />;
    if (type === 'application') return <FileText className="text-purple-600" />;
    return <CheckCircle2 className="text-green-600" />;
  };

  const { ready } = useRequireAuth();

  if (!ready) return null;
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Bell className="text-blue-600" /> Notifications
            </h1>
            <p className="text-gray-600 mt-1">Updates on your applications, friends and posts.</p>
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

        {!user ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            Please sign in to view your notifications.
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-red-600">{error}</div>
        ) : loading ? (
          <div className="bg-white rounded-xl shadow-sm p-5 text-gray-500">Loading notifications...</div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500 flex flex-col items-center gap-2">
            <Inbox className="w-8 h-8 text-gray-300" />
            No notifications here.
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((n) => (
              <button
                key={n._id}
                onClick={() => markRead(n)}
                className={`w-full text-left bg-white rounded-xl shadow-sm p-4 flex gap-3 hover:bg-gray-50 ${!n.read ? 'border border-blue-100' : ''}`}
              >
                <div className="mt-1">{iconFor(n.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-gray-900">{n.title || 'Notification'}</div>
                    <div className={`text-xs ${n.read ? 'text-gray-400' : 'text-blue-600 font-semibold'}`}>
                      {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                    </div>
                  </div>
                  <div className="text-gray-600 text-sm mt-1">{n.body || n.message || ''}</div>
                  {(n as any).entityType === 'friend_request' && (n as any).fromUser && (
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        type="button"
                        disabled={actionId === n._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleFriendRequestAction(n, 'accept');
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50"
                      >
                        <Check size={14} /> {t('common.accept')}
                      </button>
                      <button
                        type="button"
                        disabled={actionId === n._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleFriendRequestAction(n, 'reject');
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                      >
                        <X size={14} /> {t('common.reject')}
                      </button>
                    </div>
                  )}
                  {n.link ? <div className="text-xs text-blue-600 mt-2">View →</div> : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

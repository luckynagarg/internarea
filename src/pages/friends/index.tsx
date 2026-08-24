import { useEffect, useMemo, useState } from 'react';
import { useT } from '@/i18n/runtime';
import axiosClient from '@/lib/apiClient';
import { toast } from 'react-toastify';
import {
  Users,
  UserPlus,
  UserCheck,
  XCircle,
  UserX,
  Search,
  User as UserIcon,
} from 'lucide-react';
import FriendSearch, { FriendSearchResult } from './components/FriendSearch';
import NicknameModal from './components/NicknameModal';
import FriendCard, { FriendCardModel } from './components/FriendCard';

type IncomingRequest = {
  _id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAtISO: string;
  sender?: {
    _id: string;
    name: string | null;
    username: string | null;
    nickname: string | null;
    photo: string | null;
    headline: string | null;
  } | null;
};

type SentRequest = {
  _id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAtISO: string;
  receiver?: {
    _id: string;
    name: string | null;
    username: string | null;
    nickname: string | null;
    photo: string | null;
    headline: string | null;
  } | null;
};

type FriendListItem = {
  _id: string;
  friendId: string;
  name: string | null;
  username: string | null;
  nickname: string | null;
  photo: string | null;
  headline: string | null;
};

type TabId = 'friends' | 'requests' | 'sent' | 'suggestions' | 'search';

type SearchTabResult = {
  q: string;
  results: FriendSearchResult[];
  loading: boolean;
};

export default function FriendsPage() {
  const { t } = useT();
  const [tab, setTab] = useState<TabId>('friends');

  // Friends (accepted)
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendsError, setFriendsError] = useState<string | null>(null);

  // Incoming requests
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  // Sent requests
  const [sent, setSent] = useState<SentRequest[]>([]);
  const [sentLoading, setSentLoading] = useState(true);
  const [sentError, setSentError] = useState<string | null>(null);

  // Suggestions
  const [suggestions, setSuggestions] = useState<FriendSearchResult[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  // Search tab
  const [searchTab, setSearchTab] = useState<SearchTabResult>({ q: '', results: [], loading: false });

  // Modal for nickname
  const [selectedFriend, setSelectedFriend] = useState<FriendCardModel | null>(null);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [savingNickname, setSavingNickname] = useState(false);

  // Action loading
  const [actionUid, setActionUid] = useState<string | null>(null);

  const loadFriends = async () => {
    setFriendsLoading(true);
    setFriendsError(null);
    try {
      const res = await axiosClient.get('/api/friends/list');
      const arr = res?.data?.data ?? [];
      const list = arr.map((f: any) => ({
        _id: String(f.friendId || f._id || f.uid),
        friendId: String(f.friendId || f._id || f.uid),
        name: f.name ?? null,
        username: f.username ?? null,
        nickname: f.nickname ?? null,
        photo: f.photo ?? null,
        headline: f.headline ?? null,
      }));
      setFriends(list);
    } catch (e: any) {
      setFriendsError(e?.response?.data?.message || e?.message || t('common.error'));
    } finally {
      setFriendsLoading(false);
    }
  };

  const loadRequests = async () => {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const res = await axiosClient.get('/api/friends/pending');
      const arr = res?.data?.data ?? [];
      const mapped = arr.map((r: any) => ({
        _id: String(r._id || r.requestId),
        senderId: String(r.senderId || r.sender?._id || ''),
        receiverId: String(r.receiverId || ''),
        status: r.status || 'pending',
        createdAtISO: r.createdAtISO || new Date().toISOString(),
        sender: r.sender || null,
      }));
      setRequests(mapped.filter((r: any) => r.status === 'pending'));
    } catch (e: any) {
      setRequestsError(e?.response?.data?.message || e?.message || t('common.error'));
    } finally {
      setRequestsLoading(false);
    }
  };

  const loadSent = async () => {
    setSentLoading(true);
    setSentError(null);
    try {
      const res = await axiosClient.get('/api/friends/sent');
      const arr = res?.data?.data ?? [];
      const mapped = arr.map((r: any) => ({
        _id: String(r._id || r.requestId),
        senderId: String(r.senderId || ''),
        receiverId: String(r.receiverId || r.receiver?._id || ''),
        status: r.status || 'pending',
        createdAtISO: r.createdAtISO || new Date().toISOString(),
        receiver: r.receiver || null,
      }));
      setSent(mapped.filter((r: any) => r.status === 'pending'));
    } catch (e: any) {
      setSentError(e?.response?.data?.message || e?.message || t('common.error'));
    } finally {
      setSentLoading(false);
    }
  };

  const loadSuggestions = async () => {
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const res = await axiosClient.get('/api/users/suggestions', { params: { limit: 12 } });
      const arr = res?.data?.data ?? [];
      setSuggestions(arr.map((u: any) => ({ ...u, isFriend: u.relationship === 'friends' })));
    } catch (e: any) {
      setSuggestionsError(e?.response?.data?.message || e?.message || t('common.error'));
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    loadFriends();
    loadRequests();
    loadSent();
    loadSuggestions();
  }, []);

  const refreshAll = () => {
    loadFriends();
    loadRequests();
    loadSent();
    loadSuggestions();
  };

  const handleAdd = async (target: FriendCardModel) => {
    const uid = target.uid || target._id;
    setActionUid(uid);
    try {
      await axiosClient.post('/api/friends/request', { receiver: uid });
      toast.success(t('common.addFriend'));
      setSent((prev) => [
        {
          _id: 'pending-' + uid,
          senderId: 'me',
          receiverId: uid,
          status: 'pending',
          createdAtISO: new Date().toISOString(),
          receiver: {
            _id: uid,
            name: target.name,
            username: target.username,
            nickname: target.nickname,
            photo: target.photo,
            headline: target.headline,
          },
        },
        ...prev,
      ]);
      loadSuggestions();
    } catch (e: any) {
      toast.error(t('common.error'));
    } finally {
      setActionUid(null);
    }
  };

  const handleCancel = async (target: FriendCardModel) => {
    const uid = target.uid || target._id;
    setActionUid(uid);
    try {
      await axiosClient.post('/api/friends/cancel', { receiver: uid });
      toast.success(t('common.cancelRequest'));
      setSent((prev) => prev.filter((r) => r.receiverId !== uid && r.receiver?._id !== uid));
      loadSuggestions();
    } catch (e: any) {
      toast.error(t('common.error'));
    } finally {
      setActionUid(null);
    }
  };

  const handleAccept = async (target: FriendCardModel) => {
    const uid = target.uid || target._id;
    setActionUid(uid);
    try {
      await axiosClient.post('/api/friends/accept', { sender: uid });
      toast.success(t('common.accept'));
      setRequests((prev) => prev.filter((r) => r.senderId !== uid && r.sender?._id !== uid));
      const req = requests.find((r) => r.senderId === uid || r.sender?._id === uid);
      const other = req?.sender;
      setFriends((prev) => [
        ...prev,
        {
          _id: uid,
          friendId: uid,
          name: other?.name ?? target.name,
          username: other?.username ?? target.username,
          nickname: other?.nickname ?? target.nickname,
          photo: other?.photo ?? target.photo,
          headline: other?.headline ?? target.headline,
        },
      ]);
    } catch (e: any) {
      toast.error(t('common.error'));
    } finally {
      setActionUid(null);
    }
  };

  const handleReject = async (target: FriendCardModel) => {
    const uid = target.uid || target._id;
    setActionUid(uid);
    try {
      await axiosClient.post('/api/friends/reject', { sender: uid });
      toast.success(t('common.reject'));
      setRequests((prev) => prev.filter((r) => r.senderId !== uid && r.sender?._id !== uid));
    } catch (e: any) {
      toast.error(t('common.error'));
    } finally {
      setActionUid(null);
    }
  };

  const handleRemove = async (target: FriendCardModel) => {
    const uid = target.uid || target._id;
    setActionUid(uid);
    try {
      await axiosClient.delete('/api/friends/remove', { data: { friendId: uid } });
      toast.success(t('common.removeFriend'));
      setFriends((prev) => prev.filter((f) => f.friendId !== uid && f._id !== uid));
    } catch (e: any) {
      toast.error(t('common.error'));
    } finally {
      setActionUid(null);
    }
  };

  const handleNicknameSave = async (nickname: string) => {
    if (!selectedFriend) return;
    const friendId = selectedFriend.uid || selectedFriend._id;
    const prevNickname = selectedFriend.nickname;
    const trimmed = nickname.trim();
    const nextNickname = trimmed.length ? trimmed : null;

    setSelectedFriend((p) => (p ? { ...p, nickname: nextNickname } : p));
    setFriends((prev) =>
      prev.map((f) => (f.friendId === friendId ? { ...f, nickname: nextNickname } : f))
    );

    setSavingNickname(true);
    try {
      await axiosClient.patch(`/api/friends/${encodeURIComponent(friendId)}/nickname`, {
        nickname: nextNickname,
      });
      toast.success(nextNickname ? t('common.editNickname') : t('common.actionCompleted'));
      setIsNicknameModalOpen(false);
    } catch (e: any) {
      toast.error(t('common.error'));
      setSelectedFriend((p) => (p ? { ...p, nickname: prevNickname } : p));
      setFriends((prev) =>
        prev.map((f) => (f.friendId === friendId ? { ...f, nickname: prevNickname } : f))
      );
    } finally {
      setSavingNickname(false);
    }
  };

  const counts = useMemo(() => {
    const friendCount = friends.length;
    const requestCount = requests.length;
    const sentCount = sent.length;
    return { friendCount, requestCount, sentCount };
  }, [friends, requests, sent]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'friends', label: t('friends.friendsList'), icon: <UserCheck size={16} />, count: counts.friendCount },
    { id: 'requests', label: t('friends.pendingRequests'), icon: <UserPlus size={16} />, count: counts.requestCount },
    { id: 'sent', label: t('friends.recentRequests'), icon: <Users size={16} />, count: counts.sentCount },
    { id: 'suggestions', label: t('friends.suggestions'), icon: <UserIcon size={16} />, count: 0 },
    { id: 'search', label: t('friends.searchResults'), icon: <Search size={16} />, count: 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="text-blue-600" /> {t('friends.pageTitle')}
            </h1>
            <p className="text-gray-600 mt-1">
              {t('friends.pageDesc')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition ${
                tab === t.id
                  ? 'bg-white text-blue-700 border border-b-0 border-gray-200 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {t.icon}
              {t.label}
              {t.count > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          {tab === 'friends' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-900">
                  {t('friends.connections', { values: { count: friends.length } })}
                </div>
              </div>

              {friendsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="border rounded-lg p-3 flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-2/3" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : friendsError ? (
                <div className="py-10 text-center text-red-600">
                  <div className="font-medium">{friendsError}</div>
                  <button type="button" onClick={loadFriends} className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline">
                    {t('common.tryAgain')}
                  </button>
                </div>
              ) : friends.length === 0 ? (
                <div className="py-10 text-center text-gray-500">
                  <UserX className="mx-auto mb-3 text-gray-300" size={40} />
                  <div className="font-medium text-gray-700">{t('friends.noResults')}</div>
                  <div className="text-sm mt-1">
                    {t('friends.searchHint')}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {friends.map((f) => (
                    <FriendCard
                      key={f.friendId || f._id}
                      friend={{
                        _id: f.friendId || f._id,
                        uid: f.friendId || f._id,
                        name: f.name,
                        username: f.username,
                        nickname: f.nickname,
                        photo: f.photo,
                        headline: f.headline,
                        isFriend: true,
                        relationship: 'friends',
                      }}
                      onEditNickname={(fr) => {
                        setSelectedFriend(fr);
                        setIsNicknameModalOpen(true);
                      }}
                      onRemove={handleRemove}
                      removing={actionUid === f.friendId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'requests' && (
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-4">{t('friends.pendingRequests')}</div>
              {requestsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-3 flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                        <div className="h-3 bg-gray-200 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : requestsError ? (
                <div className="py-10 text-center text-red-600">
                  <div className="font-medium">{requestsError}</div>
                  <button type="button" onClick={loadRequests} className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline">
                    {t('common.tryAgain')}
                  </button>
                </div>
              ) : requests.length === 0 ? (
                <div className="py-10 text-center text-gray-500">
                  <UserPlus className="mx-auto mb-3 text-gray-300" size={40} />
                  {t('friends.noResults')}
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((r) => {
                    const sender = r.sender;
                    return (
                      <div key={r._id} className="border rounded-lg p-3 flex items-center gap-3">
                        <img
                          src={sender?.photo || 'https://via.placeholder.com/48'}
                          alt={sender?.name || t('friends.unknown')}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {sender?.name || sender?.nickname || t('friends.unknown')}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {sender?.nickname ? `@${sender.nickname}` : ''} • {t('common.requested')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={!!actionUid}
                            onClick={() => handleAccept({
                              _id: r.senderId,
                              uid: r.senderId,
                              name: sender?.name ?? null,
                              username: sender?.username ?? null,
                              nickname: sender?.nickname ?? null,
                              photo: sender?.photo ?? null,
                              headline: sender?.headline ?? null,
                              isFriend: false,
                              relationship: 'request_received',
                            })}
                            className="px-3 py-1 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            {t('common.accept')}
                          </button>
                          <button
                            disabled={!!actionUid}
                            onClick={() => handleReject({
                              _id: r.senderId,
                              uid: r.senderId,
                              name: sender?.name ?? null,
                              username: sender?.username ?? null,
                              nickname: sender?.nickname ?? null,
                              photo: sender?.photo ?? null,
                              headline: sender?.headline ?? null,
                              isFriend: false,
                              relationship: 'request_received',
                            })}
                            className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
                          >
                            {t('common.reject')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'sent' && (
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-4">{t('friends.recentRequests')}</div>
              {sentLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-3 flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                        <div className="h-3 bg-gray-200 rounded w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sentError ? (
                <div className="py-10 text-center text-red-600">
                  <div className="font-medium">{sentError}</div>
                  <button type="button" onClick={loadSent} className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline">
                    {t('common.tryAgain')}
                  </button>
                </div>
              ) : sent.length === 0 ? (
                <div className="py-10 text-center text-gray-500">
                  <Users className="mx-auto mb-3 text-gray-300" size={40} />
                  {t('friends.noResults')}
                </div>
              ) : (
                <div className="space-y-3">
                  {sent.map((r) => {
                    const recv = r.receiver;
                    return (
                      <div key={r._id} className="border rounded-lg p-3 flex items-center gap-3">
                        <img
                          src={recv?.photo || 'https://via.placeholder.com/48'}
                          alt={recv?.name || t('friends.unknown')}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {recv?.name || recv?.nickname || t('friends.unknown')}
                          </div>
                          <div className="text-xs text-gray-500">{t('common.requested')}</div>
                        </div>
                        <button
                          disabled={!!actionUid}
                          onClick={() => handleCancel({
                            _id: r.receiverId,
                            uid: r.receiverId,
                            name: recv?.name ?? null,
                            username: recv?.username ?? null,
                            nickname: recv?.nickname ?? null,
                            photo: recv?.photo ?? null,
                            headline: recv?.headline ?? null,
                            isFriend: false,
                            relationship: 'request_sent',
                          })}
                          className="px-3 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 disabled:opacity-50"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'suggestions' && (
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-4">{t('common.suggestions')}</div>
              {suggestionsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="border rounded-lg p-3 flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-2/3" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : suggestionsError ? (
                <div className="py-10 text-center text-red-600">
                  <div className="font-medium">{suggestionsError}</div>
                  <button type="button" onClick={loadSuggestions} className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline">
                    {t('common.tryAgain')}
                  </button>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="py-10 text-center text-gray-500">
                  <UserIcon className="mx-auto mb-3 text-gray-300" size={40} />
                  {t('common.suggestionsNone')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {suggestions.map((s) => (
                    <FriendCard
                      key={s._id}
                      friend={s}
                      onAdd={handleAdd}
                      actionLoading={actionUid === (s.uid || s._id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'search' && (
            <div>
              <FriendSearch
                apiBase=""
                onLoading={(l) => setSearchTab((p) => ({ ...p, loading: l }))}
                onResults={(results, q) => setSearchTab((p) => ({ ...p, results, q }))}
              />
              {searchTab.q.trim().length === 0 ? (
                <div className="py-10 text-center text-gray-500 text-sm">
                  {t('friends.searchHint')}
                </div>
              ) : searchTab.loading ? (
                <div className="py-10 text-center text-gray-500">{t('friends.searching')}</div>
              ) : searchTab.results.length === 0 ? (
                <div className="py-10 text-center text-gray-500">{t('friends.noResults')}</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {searchTab.results.map((r) => (
                    <FriendCard
                      key={r._id}
                      friend={r}
                      onAdd={handleAdd}
                      onCancel={handleCancel}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      actionLoading={actionUid === (r.uid || r._id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <NicknameModal
        open={isNicknameModalOpen}
        friend={
          selectedFriend
            ? {
                _id: selectedFriend._id,
                name: selectedFriend.name,
                nickname: selectedFriend.nickname,
              }
            : null
        }
        saving={savingNickname}
        onClose={() => {
          if (!savingNickname) setIsNicknameModalOpen(false);
        }}
        onSave={handleNicknameSave}
      />
    </div>
  );
}

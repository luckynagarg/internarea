import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchOrMock } from '@/mockData/fetchOrMock';
import { mockData, MockFriendRequest, MockUser } from '@/mockData';
import axios from 'axios';
import { toast } from 'react-toastify';

import { Users, UserPlus, UserCheck, XCircle } from 'lucide-react';
import FriendSearch, { FriendSearchResult } from './components/FriendSearch';
import NicknameModal from './components/NicknameModal';
import FriendCard from './components/FriendCard';
import { getAuthHeaders } from '@/lib/authHeaders';
import { getAuthToken } from '@/lib/authHeaders';



const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||

  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000';

export default function FriendsPage() {
  const currentUser = ((): MockUser | null => {
    // Auth layer is not consistent in this repo; use a stable mock user by default.
    return mockData.users[0] ?? null;
  })();

  const [requests, setRequests] = useState<MockFriendRequest[]>([]);
  const [friends, setFriends] = useState<MockUser[]>([]);

  const [searchResults, setSearchResults] = useState<FriendSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);


  const [selectedFriend, setSelectedFriend] = useState<FriendSearchResult | null>(null);
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [savingNickname, setSavingNickname] = useState(false);




  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!currentUser) return;

      const reqs = await fetchOrMock<MockFriendRequest[]>({
        url: `${API_BASE}/api/friends/requests?userId=${encodeURIComponent(currentUser.uid)}`,
        mock: () => mockData.friendRequests,
        transform: (data) => {
          const arr = data?.data ?? data?.requests ?? data;
          return Array.isArray(arr) ? arr : [];
        },
      });

      // Friends list is not currently exposed by backend routes in this snapshot.
      // So derive accepted friends from requests when available; otherwise show mock friends.
      const accepted = reqs.filter((r) => r.status === 'accepted');
      const friendIds = new Set<string>();
      for (const r of accepted) {
        friendIds.add(r.senderId === currentUser.uid ? r.receiverId : r.senderId);
      }

      const friendList = Array.from(friendIds)
        .map((id) => mockData.users.find((u) => u.uid === id))
        .filter(Boolean) as MockUser[];

      const finalFriends = friendList.length ? friendList : mockData.users.slice(1, 61);

      if (!mounted) return;
      setRequests(reqs);
      setFriends(finalFriends);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  const usersForSuggestions = useMemo(() => mockData.users.slice(0, 120), []);


  const counts = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'pending').length;
    const accepted = requests.filter((r) => r.status === 'accepted').length;
    const rejected = requests.filter((r) => r.status === 'rejected').length;
    return { pending, accepted, rejected };
  }, [requests]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="text-blue-600" /> Friends & Connections
            </h1>
            <p className="text-gray-600 mt-1">Suggestions, requests, mutual connections—always populated for demos.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Pending requests</div>
                <div className="text-2xl font-bold text-yellow-700">{counts.pending}</div>
              </div>
              <UserPlus className="text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Accepted requests</div>
                <div className="text-2xl font-bold text-green-700">{counts.accepted}</div>
              </div>
              <UserCheck className="text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">Rejected requests</div>
                <div className="text-2xl font-bold text-red-700">{counts.rejected}</div>
              </div>
              <XCircle className="text-red-600" />
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-5 lg:col-span-1">
            <div className="mb-4">
              <FriendSearch
                apiBase={API_BASE}
                onLoading={setSearchLoading}
                onResults={(results) => {
                  setSearchResults(results);
                }}
              />
            </div>


            <div className="text-sm font-semibold text-gray-900 mb-3">Search results</div>
            <div className="space-y-3">
              {searchQuery.trim().length === 0 ? (
                <div className="text-sm text-gray-500">Type to search friends by name, username, or nickname.</div>
              ) : searchLoading ? (
                <div className="text-sm text-gray-500">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="text-sm text-gray-500">No results found.</div>
              ) : (
                searchResults.map((r) => (
                  <div key={r._id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={r.photo || "https://via.placeholder.com/64"}
                        alt={r.name || "Friend"}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">{r.nickname || r.name || "Unknown"}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {r.username ? `@${r.username}` : ""}
                          {r.headline ? ` • ${r.headline}` : ""}
                          {r.isFriend ? " • Friend" : ""}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-sm px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                      disabled={r.isFriend}
                    >
                      {r.isFriend ? "Connected" : "Connect"}
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-semibold text-gray-900">Friends list</div>
                <div className="text-xs text-gray-500">{friends.length} connections • Mutual friends are implied in the mock graph</div>
              </div>
              <Link href="/public" className="text-sm text-blue-600 hover:text-blue-700">View Public Space</Link>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {friends.slice(0, 24).map((u) => (
                <FriendCard
                  key={u.uid}
                  friend={{
                    _id: u.uid,
                    name: u.name,
                    username: null,
                    nickname: (u as any).nickname ?? null,
                    photo: u.photo,
                    headline: null,
                    isFriend: true,
                  }}
                  onEditNickname={(friend) => {
                    setSelectedFriend(friend);
                    setIsNicknameModalOpen(true);
                  }}

                />
              ))}
            </div>


            <div className="mt-6 border-t pt-5">
              <div className="text-sm font-semibold text-gray-900 mb-3">Recent friend requests</div>
              <div className="space-y-3">
                {requests.slice(0, 10).map((r) => {
                  const otherId = r.senderId === currentUser?.uid ? r.receiverId : r.senderId;
                  const other = mockData.users.find((u) => u.uid === otherId);
                  if (!other) return null;
                  const icon = r.status === 'pending' ? <UserPlus className="text-yellow-600" /> : r.status === 'accepted' ? <UserCheck className="text-green-600" /> : <XCircle className="text-red-600" />;
                  return (
                    <div key={r._id} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {icon}
                        <img src={other.photo} alt={other.name} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{other.name}</div>
                          <div className="text-xs text-gray-500">{r.status.toUpperCase()} • {new Date(r.createdAtISO).toLocaleDateString()}</div>
                        </div>
                      </div>
                      {r.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <button className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Accept</button>
                          <button className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">Reject</button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">Done</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
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
        onSave={async (nickname) => {
          if (!selectedFriend) return;

          const friendId = selectedFriend._id;
          const prevNickname = selectedFriend.nickname;
          const trimmed = nickname.trim();
          const nextNickname = trimmed.length ? trimmed : null;

          // optimistic
          setSelectedFriend((p) => (p ? { ...p, nickname: nextNickname } : p));
          setFriends((prev) =>
            prev.map((u) => (u.uid === friendId ? ({ ...(u as any), nickname: nextNickname } as any) : u))
          );
          setSearchResults((prev) =>
            prev.map((r) => (r._id === friendId ? { ...r, nickname: nextNickname } : r))
          );

          setSavingNickname(true);
          try {
            const res = await axios.patch(
              `${API_BASE}/api/friends/${encodeURIComponent(friendId)}/nickname`,
              { nickname: nextNickname },
              {
                headers: await getAuthHeaders(),
              }
            );

            if (res.status >= 200 && res.status < 300) {
              toast.success(nextNickname ? 'Nickname updated.' : 'Nickname removed.');
              setIsNicknameModalOpen(false);
            } else {
              toast.error("Couldn't update nickname.");
              // rollback
              setSelectedFriend((p) => (p ? { ...p, nickname: prevNickname } : p));
              setFriends((prev) =>
                prev.map((u) => (u.uid === friendId ? ({ ...(u as any), nickname: prevNickname } as any) : u))
              );
              setSearchResults((prev) =>
                prev.map((r) => (r._id === friendId ? { ...r, nickname: prevNickname } : r))
              );
            }
          } catch (e: any) {
            if (e?.response?.status === 401) {
              toast.error("Couldn't update nickname.");
            } else {
              toast.error("Couldn't update nickname.");
            }
            // rollback
            setSelectedFriend((p) => (p ? { ...p, nickname: prevNickname } : p));
            setFriends((prev) =>
              prev.map((u) => (u.uid === friendId ? ({ ...(u as any), nickname: prevNickname } as any) : u))
            );
            setSearchResults((prev) =>
              prev.map((r) => (r._id === friendId ? { ...r, nickname: prevNickname } : r))
            );
          } finally {
            setSavingNickname(false);
          }
        }}
      />

    </div>
  );
}



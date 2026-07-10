import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { mockData, MockConversation, MockChatMessage, MockUser } from '@/mockData';
import { fetchOrMock } from '@/mockData/fetchOrMock';
import { MessageSquareMore, Eye, EyeOff } from 'lucide-react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000';

export default function ChatPage() {
  const currentUser: MockUser | null = mockData.users[1] ?? null;

  const [query, setQuery] = useState('');
  const [conversations, setConversations] = useState<MockConversation[]>([]);
  const [messagesByConversationId, setMessagesByConversationId] = useState<Record<string, MockChatMessage[]>>({});
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!currentUser) return;

      const mockConvos = mockData.chats.conversations;

      const convos = await fetchOrMock<MockConversation[]>({
        url: `${API_BASE}/api/chat/conversations?userId=${encodeURIComponent(currentUser.uid)}`,
        mock: () => mockConvos,
        transform: (data) => (data?.data ? data.data : data?.conversations ? data.conversations : data),
      });

      // This repo snapshot doesn’t show chat endpoints; fallback will handle it.
      // Still, keep shape flexible.
      const msgs = mockData.chats.messages;

      const byId: Record<string, MockChatMessage[]> = {};
      for (const m of msgs) {
        byId[m.conversationId] = byId[m.conversationId] || [];
        byId[m.conversationId].push(m);
      }

      // If backend returned conversations, still use mock messages unless backend provides them.
      const finalConvos = Array.isArray(convos) && convos.length ? convos : mockConvos;

      if (!mounted) return;
      setConversations(finalConvos.slice(0, 30));
      const active = finalConvos[0]?._id ?? '';
      setActiveConversationId(active);
      setMessagesByConversationId(byId);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [currentUser]);

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const otherId = currentUser?.uid === c.userIdA ? c.userIdB : c.userIdA;
      const other = mockData.users.find((u) => u.uid === otherId);
      const otherName = other?.name || '';
      return otherName.toLowerCase().includes(q) || other?.headline?.toLowerCase().includes(q);
    });
  }, [conversations, query, currentUser]);

  const activeMessages = activeConversationId
    ? messagesByConversationId[activeConversationId] || []
    : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MessageSquareMore className="text-blue-600" /> Chat
            </h1>
            <p className="text-gray-600 mt-1">Recent conversations with unread counts and natural messages.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
            <Eye className="w-4 h-4" /> Demo mode
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search chats by person..."
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            {loading ? (
              <div className="text-gray-500 text-sm">Loading conversations...</div>
            ) : (
              <div className="space-y-3">
                {filteredConversations.map((c) => {
                  const otherId = currentUser?.uid === c.userIdA ? c.userIdB : c.userIdA;
                  const other = mockData.users.find((u) => u.uid === otherId);
                  const isActive = c._id === activeConversationId;
                  return (
                    <button
                      type="button"
                      key={c._id}
                      onClick={() => setActiveConversationId(c._id)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        isActive ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={other?.photo || '/logo.png'}
                          alt={other?.name || 'user'}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 truncate">{other?.name || 'User'}</div>
                          <div className="text-xs text-gray-500 truncate">{c.lastMessage?.text || 'No messages'}</div>
                        </div>
                        {c.unreadCount > 0 ? (
                          <div className="text-xs font-bold text-white bg-blue-600 rounded-full px-2 py-1">
                            {c.unreadCount}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">✓</div>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-2">
                        {c.lastMessage?.createdAtISO ? new Date(c.lastMessage.createdAtISO).toLocaleString() : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-4">
            {activeConversationId ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-gray-500">Conversation</div>
                    <div className="text-lg font-semibold text-gray-900">Messages</div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {activeMessages.length} messages
                  </div>
                </div>

                <div className="h-[520px] overflow-auto rounded-lg border p-3 space-y-3 bg-gray-50">
                  {activeMessages.length ? (
                    activeMessages.map((m) => {
                      const mine = m.fromUserId === currentUser?.uid;
                      return (
                        <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                              mine ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 border'
                            }`}
                          >
                            <div className="whitespace-pre-wrap">{m.text}</div>
                            <div className={`text-[11px] mt-1 ${mine ? 'text-blue-100' : 'text-gray-500'}`}>
                              {new Date(m.createdAtISO).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-gray-500 text-sm">No messages yet.</div>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    placeholder="Write a message (demo)"
                    disabled
                  />
                  <button className="px-4 py-2 rounded-lg bg-gray-200 text-gray-600" disabled>
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-sm">Pick a conversation to start.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


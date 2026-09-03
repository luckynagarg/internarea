import React, { useEffect, useState } from "react";
import axios from "axios";
import { X, Loader2, Search } from "lucide-react";
import { API_URL } from "@/config/api";
import { getAuthHeaders } from "@/lib/authHeaders";
import { useT } from "@/i18n/runtime";
import { toast } from "react-toastify";
import type { Conversation } from "./index";

type UserResult = {
  uid: string;
  name: string | null;
  username: string | null;
  nickname: string | null;
  photo: string | null;
  headline: string | null;
};

export default function NewChatModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (conversation: Conversation) => void;
}) {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) { setResults([]); return; }
      try {
        setLoading(true);
        const headers = await getAuthHeaders();
        const res = await axios.get(API_URL("/api/messages/users/search"), {
          headers, params: { q: query.trim(), limit: 20 },
        });
        if (res.data?.success) setResults(res.data.data || []);
      } catch { /* ignore */ } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const startChat = async (targetUid: string) => {
    if (starting) return;
    setStarting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await axios.post(API_URL("/api/messages/conversations"), { targetUid }, { headers });
      if (res.data?.success) onSelect(res.data.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to start chat.");
    } finally { setStarting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t("messages.newChat")}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("messages.searchUsers")} className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin text-blue-600" size={20} /></div>
          ) : results.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-8">
              {query.trim() ? t("messages.noUsersFound") : t("messages.searchUsersPrompt")}
            </p>
          ) : (
            <div className="space-y-2">
              {results.map((user) => (
                <button key={user.uid} onClick={() => startChat(user.uid)} disabled={starting} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {user.photo ? <img src={user.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-500 font-medium text-sm">{user.name?.[0]?.toUpperCase() || "?"}</div>}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{user.name || user.nickname || "User"}</div>
                    {user.username && <div className="text-xs text-gray-500 truncate">@{user.username}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

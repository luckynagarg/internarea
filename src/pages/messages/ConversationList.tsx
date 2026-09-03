import React from "react";
import { MessageSquare, Search, Loader2 } from "lucide-react";
import { useT } from "@/i18n/runtime";
import type { Conversation } from "./index";

type Props = {
  conversations: Conversation[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeConversation: Conversation | null;
  onSelect: (c: Conversation) => void;
  visible: boolean;
};

export default function ConversationList({
  conversations, loading, searchQuery, onSearchChange,
  activeConversation, onSelect, visible,
}: Props) {
  const { t } = useT();

  return (
    <div className={`w-full md:w-80 border-r border-gray-200 flex flex-col ${visible ? "flex" : "hidden md:flex"}`}>
      <div className="p-4 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("messages.searchConversations")}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <MessageSquare className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-500 text-sm">{t("messages.noConversations")}</p>
          </div>
        ) : (
          conversations.map((c) => (
            <button
              key={c._id}
              onClick={() => onSelect(c)}
              className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-50 transition-colors ${
                activeConversation?._id === c._id ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {c.otherUser.photo ? (
                    <img src={c.otherUser.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-medium text-sm">
                      {c.otherUser.name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 text-sm truncate">
                      {c.otherUser.name || c.otherUser.nickname || "User"}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {c.lastMessage?.messageType === "image" ? "📷 Image" : c.lastMessage?.text || t("messages.noMessages")}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { MessageSquare, Plus } from "lucide-react";
import { useT } from "@/i18n/runtime";
import NewChatModal from "./NewChatModal";
import ConversationList from "./ConversationList";
import ChatWindow from "./ChatWindow";
import { useMessages } from "./useMessages";

export type OtherUser = {
  uid: string;
  name: string | null;
  username: string | null;
  nickname: string | null;
  photo: string | null;
};

export type LastMessage = {
  _id: string;
  messageType: string;
  text: string | null;
  imageUrl: string | null;
  senderId: string;
  createdAt: string;
};

export type Conversation = {
  _id: string;
  participants: string[];
  otherUser: OtherUser;
  lastMessage: LastMessage | null;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  _id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  messageType: "text" | "image";
  text: string | null;
  imageUrl: string | null;
  createdAt: string;
  readAt: string | null;
};

export default function MessagesPage() {
  const { t } = useT();
  const {
    conversations, loading, searchQuery, setSearchQuery,
    activeConversation, messages, messagesLoading,
    messageInput, sending, showMobileChat,
    openConversation, leaveConversation,
    sendTextMessage, sendImageMessage, handleKeyDown,
    filteredConversations, otherUser, setMessageInput,
  } = useMessages();

  const [showNewChat, setShowNewChat] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="text-blue-600" />
            {t("messages.title")}
          </h1>
          <button onClick={() => setShowNewChat(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            <Plus size={16} />
            {t("messages.newChat")}
          </button>
        </div>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex h-[calc(100vh-200px)]">
            <ConversationList
              conversations={filteredConversations}
              loading={loading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeConversation={activeConversation}
              onSelect={openConversation}
              visible={!showMobileChat}
            />
            <ChatWindow
              conversation={activeConversation}
              otherUser={otherUser}
              messages={messages}
              messagesLoading={messagesLoading}
              messageInput={messageInput}
              sending={sending}
              onInputChange={setMessageInput}
              onSendText={sendTextMessage}
              onSendImage={sendImageMessage}
              onKeyDown={handleKeyDown}
              onBack={leaveConversation}
              visible={showMobileChat}
            />
          </div>
        </div>
      </div>
      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onSelect={(c) => { setShowNewChat(false); openConversation(c); }}
        />
      )}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_URL } from "@/config/api";
import { getAuthHeaders } from "@/lib/authHeaders";
import { toast } from "react-toastify";
import { useSocket } from "@/hooks/useSocket";
import type { Conversation, ChatMessage } from "@/types/messages";

export function useMessages() {
  const { on, off, emit } = useSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const res = await axios.get(API_URL("/api/messages/conversations"), { headers });
      if (res.data?.success) setConversations(res.data.data || []);
    } catch {
      toast.error("Failed to load conversations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    const handleNewMessage = (data: { message: ChatMessage }) => {
      const msg = data.message;
      setMessages((prev) => prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]);
      setConversations((prev) =>
        prev.map((c) =>
          String(c._id) === String(msg.conversationId)
            ? { ...c, lastMessage: { _id: msg._id, messageType: msg.messageType, text: msg.text, imageUrl: msg.imageUrl, senderId: msg.senderId, createdAt: msg.createdAt }, lastMessageAt: msg.createdAt }
            : c
        )
      );
    };
    const handleConversationUpdated = () => { loadConversations(); };
    on("new_message", handleNewMessage);
    on("conversation_updated", handleConversationUpdated);
    return () => { off("new_message", handleNewMessage); off("conversation_updated", handleConversationUpdated); };
  }, [on, off, loadConversations]);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setMessagesLoading(true);
      const headers = await getAuthHeaders();
      const res = await axios.get(API_URL(`/api/messages/conversations/${conversationId}/messages`), { headers, params: { limit: 50 } });
      if (res.data?.success) setMessages(res.data.data || []);
    } catch { /* ignore */ } finally { setMessagesLoading(false); }
  }, []);

  const openConversation = useCallback(async (conversation: Conversation) => {
    setActiveConversation(conversation);
    setShowMobileChat(true);
    await loadMessages(conversation._id);
    emit("join_conversation", { conversationId: conversation._id });
    try {
      const headers = await getAuthHeaders();
      await axios.patch(API_URL(`/api/messages/conversations/${conversation._id}/read`), {}, { headers });
      setConversations((prev) => prev.map((c) => String(c._id) === String(conversation._id) ? { ...c, unreadCount: 0 } : c));
    } catch { /* ignore */ }
  }, [emit, loadMessages]);

  const leaveConversation = useCallback(() => {
    if (activeConversation) emit("leave_conversation", { conversationId: activeConversation._id });
    setActiveConversation(null);
    setMessages([]);
    setShowMobileChat(false);
  }, [activeConversation, emit]);

  // Send via Socket.IO and wait for the server to acknowledge. If the socket
  // isn't connected, the ack never fires on failure, or the server rejects the
  // message, the caller falls back to the reliable HTTP endpoint.
  const sendViaSocket = useCallback(
    (payload: any) =>
      new Promise<boolean>((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error("Socket send timed out."));
        }, 6000);
        const sent = emit("send_message", payload, (res: any) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (res?.success) resolve(true);
          else reject(new Error(res?.error || "Failed to send message."));
        });
        if (!sent) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(new Error("Socket not connected."));
        }
      }),
    [emit]
  );

  const sendTextMessage = useCallback(async () => {
    const text = messageInput.trim();
    if (!text || !activeConversation || sending) return;
    setSending(true);
    setMessageInput("");
    const payload = {
      conversationId: activeConversation._id,
      text,
      messageType: "text",
    };
    try {
      await sendViaSocket(payload);
    } catch {
      // Fallback: reliable HTTP endpoint.
      try {
        const headers = await getAuthHeaders();
        await axios.post(API_URL("/api/messages/messages"), payload, { headers });
        await loadMessages(activeConversation._id);
      } catch {
        toast.error("Failed to send message.");
        setMessageInput(text);
      }
    } finally {
      setSending(false);
    }
  }, [
    messageInput,
    activeConversation,
    sending,
    sendViaSocket,
    loadMessages,
  ]);

  const sendImageMessage = useCallback(
    async (imageUrl: string) => {
      if (!activeConversation) return;
      setSending(true);
      const payload = {
        conversationId: activeConversation._id,
        imageUrl,
        messageType: "image",
      };
      try {
        await sendViaSocket(payload);
      } catch {
        // Fallback: reliable HTTP endpoint.
        try {
          const headers = await getAuthHeaders();
          await axios.post(API_URL("/api/messages/messages"), payload, { headers });
          await loadMessages(activeConversation._id);
        } catch {
          toast.error("Failed to send image.");
        }
      } finally {
        setSending(false);
      }
    },
    [activeConversation, sendViaSocket, loadMessages]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTextMessage(); }
  };

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.otherUser.name?.toLowerCase().includes(q) || c.otherUser.nickname?.toLowerCase().includes(q) || c.otherUser.username?.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  const otherUser = activeConversation?.otherUser || null;

  return {
    conversations, loading, searchQuery, setSearchQuery,
    activeConversation, messages, messagesLoading,
    messageInput, sending, showMobileChat,
    openConversation, leaveConversation,
    sendTextMessage, sendImageMessage, handleKeyDown,
    filteredConversations, otherUser, setMessageInput,
  };
}

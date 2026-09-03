import React, { useRef, useState } from "react";
import { ArrowLeft, Loader2, Send, Image as ImageIcon } from "lucide-react";
import { useT } from "@/i18n/runtime";
import axios from "axios";
import { API_URL } from "@/config/api";
import { getAuthHeaders } from "@/lib/authHeaders";
import { toast } from "react-toastify";
import type { Conversation, ChatMessage, OtherUser } from "./index";

type Props = {
  conversation: Conversation | null;
  otherUser: OtherUser | null;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messageInput: string;
  sending: boolean;
  onInputChange: (v: string) => void;
  onSendText: () => void;
  onSendImage: (url: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBack: () => void;
  visible: boolean;
};

export default function ChatWindow(props: Props) {
  const { t } = useT();
  const { conversation, otherUser, messages, messagesLoading, messageInput, sending,
    onInputChange, onSendText, onSendImage, onKeyDown, onBack, visible } = props;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      toast.error("Unsupported file type."); return;
    }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image too large (max 5 MB)."); return; }
    setUploading(true);
    try {
      const headers = await getAuthHeaders();
      const fd = new FormData();
      fd.append("image", file);
      const res = await axios.post(API_URL("/api/messages/upload"), fd, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
      });
      if (res.data?.success && res.data.data?.imageUrl) onSendImage(res.data.data.imageUrl);
      else toast.error("Upload failed.");
    } catch (err: any) { toast.error(err?.response?.data?.message || "Upload failed."); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  if (!conversation) {
    return (
      <div className={`flex-1 flex items-center justify-center bg-gray-50 ${visible ? "flex" : "hidden md:flex"}`}>
        <div className="text-center">
          <ImageIcon className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 text-sm">{t("messages.selectConversation")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col ${visible ? "flex" : "hidden md:flex"}`}>
      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={onBack} className="md:hidden p-1 hover:bg-gray-100 rounded"><ArrowLeft size={20} /></button>
        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
          {otherUser?.photo ? <img src={otherUser.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-500 font-medium text-xs">{otherUser?.name?.[0]?.toUpperCase() || "?"}</div>}
        </div>
        <div>
          <div className="font-medium text-gray-900 text-sm">{otherUser?.name || otherUser?.nickname || "User"}</div>
          {otherUser?.username && <div className="text-xs text-gray-500">@{otherUser.username}</div>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messagesLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-blue-600" size={24} /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12"><ImageIcon className="mx-auto text-gray-300 mb-3" size={40} /><p className="text-gray-500 text-sm">{t("messages.noMessages")}</p></div>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.senderId !== otherUser?.uid;
            return (
              <div key={msg._id || idx} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMine ? "bg-blue-600 text-white rounded-br-md" : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"}`}>
                  {msg.messageType === "image" && msg.imageUrl && <img src={msg.imageUrl} alt="Shared" className="max-w-full rounded-lg mb-1 max-h-64 object-cover" />}
                  {msg.text && <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>}
                  <p className={`text-[10px] mt-1 ${isMine ? "text-blue-100" : "text-gray-400"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {isMine && msg.readAt && " • Read"}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 border-t border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50" title="Send image">
            {uploading ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
          </button>
          <input type="text" value={messageInput} onChange={(e) => onInputChange(e.target.value)} onKeyDown={onKeyDown} placeholder={t("messages.typePlaceholder")} className="flex-1 px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={sending} />
          <button onClick={onSendText} disabled={!messageInput.trim() || sending} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}

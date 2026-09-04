import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Send,
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

import { useT } from "@/i18n/runtime";
import { API_URL } from "@/config/api";
import { getAuthHeaders } from "@/lib/authHeaders";

import type {
  Conversation,
  ChatMessage,
  OtherUser,
} from "@/types/messages";

type Props = {
  conversation: Conversation | null;
  otherUser: OtherUser | null;
  messages: ChatMessage[];
  messagesLoading: boolean;
  messageInput: string;
  sending: boolean;

  onInputChange: (value: string) => void;
  onSendText: () => void;
  onSendImage: (url: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onBack: () => void;

  visible: boolean;
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export default function ChatWindow({
  conversation,
  otherUser,
  messages,
  messagesLoading,
  messageInput,
  sending,
  onInputChange,
  onSendText,
  onSendImage,
  onKeyDown,
  onBack,
  visible,
}: Props) {
  const { t } = useT();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [uploading, setUploading] = useState(false);

  /**
   * Scroll to the latest message whenever the message list changes.
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  /**
   * Upload image and send the returned URL through the parent handler.
   */
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    // Reset input so the same image can be selected again.
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(
        "Unsupported image format. Please use JPG, PNG, WEBP or GIF."
      );
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image is too large. Maximum size is 5 MB.");
      return;
    }

    if (uploading) {
      return;
    }

    setUploading(true);

    try {
      const headers = await getAuthHeaders();

      const formData = new FormData();
      formData.append("image", file);

      const response = await axios.post(
        API_URL("/api/messages/upload"),
        formData,
        {
          headers: {
            ...headers,
            // Do not manually set multipart boundary.
            // Axios/browser will set it correctly.
          },
        }
      );

      const imageUrl = response.data?.data?.imageUrl;

      if (!response.data?.success || !imageUrl) {
        throw new Error(
          response.data?.message || "Image upload failed."
        );
      }

      onSendImage(imageUrl);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message ||
            "Unable to upload image. Please try again."
        );
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Unable to upload image. Please try again.");
      }
    } finally {
      setUploading(false);
    }
  };

  /**
   * Open the image in a new browser tab.
   */
  const handleImageClick = (imageUrl: string) => {
    window.open(imageUrl, "_blank", "noopener,noreferrer");
  };

  /**
   * Empty state when no conversation is selected.
   */
  if (!conversation) {
    return (
      <div
        className={`flex-1 items-center justify-center bg-gray-50 ${
          visible ? "flex" : "hidden md:flex"
        }`}
      >
        <div className="px-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <ImageIcon
              className="text-gray-400"
              size={26}
            />
          </div>

          <p className="text-sm font-medium text-gray-700">
            {t("messages.selectConversation")}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Select a conversation to start chatting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 flex-col overflow-hidden bg-white ${
        visible ? "flex" : "hidden md:flex"
      }`}
    >
      {/* =========================================================
          CHAT HEADER
      ========================================================== */}
      <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        {/* Mobile back button */}
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 md:hidden"
        >
          <ArrowLeft size={20} />
        </button>

        {/* User avatar */}
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100">
          {otherUser?.photo ? (
            <img
              src={otherUser.photo}
              alt={
                otherUser.name ||
                otherUser.nickname ||
                "User"
              }
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-500">
              {(
                otherUser?.name ||
                otherUser?.nickname ||
                "U"
              )
                .charAt(0)
                .toUpperCase()}
            </div>
          )}
        </div>

        {/* User information */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            {otherUser?.name ||
              otherUser?.nickname ||
              "User"}
          </p>

          {otherUser?.username && (
            <p className="truncate text-xs text-gray-500">
              @{otherUser.username}
            </p>
          )}
        </div>
      </header>

      {/* =========================================================
          MESSAGES AREA
      ========================================================== */}
      <main
        className="min-h-0 flex-1 overflow-y-auto bg-gray-50 px-4 py-4"
        aria-live="polite"
      >
        {messagesLoading ? (
          <div className="flex h-full min-h-48 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2
                className="animate-spin text-blue-600"
                size={26}
              />

              <span className="text-xs text-gray-500">
                Loading messages...
              </span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-48 items-center justify-center">
            <div className="max-w-xs px-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                <Send
                  size={20}
                  className="text-gray-400"
                />
              </div>

              <p className="text-sm font-medium text-gray-700">
                {t("messages.noMessages")}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Send a message to start the conversation.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => {
              /**
               * The parent message state should ideally already
               * identify the current user's messages.
               *
               * With the current component API, the reliable
               * fallback is comparing senderId with the other
               * user's UID.
               */
              const isMine =
                message.senderId !== otherUser?.uid;

              const messageKey =
                message._id || `message-${index}`;

              return (
                <div
                  key={messageKey}
                  className={`flex ${
                    isMine
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] ${
                      isMine
                        ? "items-end"
                        : "items-start"
                    }`}
                  >
                    <div
                      className={`overflow-hidden rounded-2xl px-4 py-2.5 shadow-sm ${
                        isMine
                          ? "rounded-br-md bg-blue-600 text-white"
                          : "rounded-bl-md border border-gray-200 bg-white text-gray-900"
                      }`}
                    >
                      {/* Image message */}
                      {message.messageType === "image" &&
                        message.imageUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              handleImageClick(
                                message.imageUrl as string
                              )
                            }
                            className="mb-1 block max-w-full overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                            aria-label="Open shared image"
                          >
                            <img
                              src={message.imageUrl}
                              alt="Shared image"
                              className="max-h-72 max-w-full cursor-pointer object-cover transition-opacity hover:opacity-90"
                              loading="lazy"
                            />
                          </button>
                        )}

                      {/* Text */}
                      {message.text && (
                        <p className="whitespace-pre-wrap break-words text-sm leading-5">
                          {message.text}
                        </p>
                      )}

                      {/* Time + read status */}
                      <div
                        className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                          isMine
                            ? "text-blue-100"
                            : "text-gray-400"
                        }`}
                      >
                        <span>
                          {new Date(
                            message.createdAt
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        {isMine && message.readAt && (
                          <span>• Read</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div
              ref={messagesEndRef}
              aria-hidden="true"
            />
          </div>
        )}
      </main>

      {/* =========================================================
          MESSAGE COMPOSER
      ========================================================== */}
      <footer className="shrink-0 border-t border-gray-200 bg-white p-3 sm:p-4">
        <div className="flex items-center gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Image button */}
          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={uploading || sending}
            aria-label={t("messages.sendImage")}
            title={t("messages.sendImage")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <Loader2
                className="animate-spin"
                size={20}
              />
            ) : (
              <ImageIcon size={20} />
            )}
          </button>

          {/* Text input */}
          <input
            type="text"
            value={messageInput}
            onChange={(event) =>
              onInputChange(event.target.value)
            }
            onKeyDown={onKeyDown}
            placeholder={t(
              "messages.typePlaceholder"
            )}
            disabled={sending || uploading}
            autoComplete="off"
            maxLength={2000}
            className="min-w-0 flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          />

          {/* Send button */}
          <button
            type="button"
            onClick={onSendText}
            disabled={
              !messageInput.trim() ||
              sending ||
              uploading
            }
            aria-label="Send message"
            title="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? (
              <Loader2
                className="animate-spin"
                size={18}
              />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>

        {/* Upload status */}
        {uploading && (
          <p className="mt-2 px-2 text-xs text-gray-400">
            Uploading image...
          </p>
        )}
      </footer>
    </div>
  );
}

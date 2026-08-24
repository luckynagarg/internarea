import React, { useEffect, useMemo, useRef, useState } from "react";
import axiosCoin from "@/lib/axiosClient";
import { Bell, X, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { useT } from "@/i18n/runtime";

export type NotificationItem = {
  _id: string;
  type: "internship" | "application" | "admin_message" | "announcement" | "social" | string;
  title: string;
  body?: string;
  createdAt: string;
  read: boolean;
  actor?: {
    name?: string;
    username?: string;
    photo?: string;
    headline?: string;
    verified?: boolean;
  } | null;
  link?: string | null;
  action?: string | null;
};

// axiosClient already sets the API base URL. Use relative paths only.
function getApiNotificationsPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.notifications)) return data.notifications;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function normalizeNotificationItem(raw: any): NotificationItem {
  const _id =
    typeof raw?._id === "string"
      ? raw._id
      : typeof raw?.id === "string"
        ? raw.id
        : String(raw?._id ?? raw?.id ?? "");

  const title = typeof raw?.title === "string" ? raw.title : "";

  const body =
    typeof raw?.body === "string"
      ? raw.body
      : typeof raw?.message === "string"
        ? raw.message
        : undefined;

  const createdAtVal = raw?.createdAt;
  const createdAt =
    typeof createdAtVal === "string" || createdAtVal instanceof Date
      ? String(createdAtVal)
      : createdAtVal
        ? new Date(createdAtVal).toISOString()
        : new Date().toISOString();

  const read = typeof raw?.read === "boolean" ? raw.read : false;
  const type = typeof raw?.type === "string" ? raw.type : "announcement";

  // Actor is either embedded (from populateNotificationActors) or raw.fromUser.
  const actor = raw?.actor || raw?.fromUser || null;

  const link = typeof raw?.link === "string" ? raw.link : null;
  const action = typeof raw?.action === "string" ? raw.action : null;

  return { _id, title, body, createdAt, read, type, actor, link, action };
}

export default function NotificationDropdown({
  open,
  onClose,
  onMarkRead,
  onUnreadChange,
}: {
  open: boolean;
  onClose: () => void;
  onMarkRead?: (items: NotificationItem[]) => void;
  onUnreadChange?: (count: number) => void;
}) {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const onMarkReadRef = useRef(onMarkRead);
  onMarkReadRef.current = onMarkRead;
  const onUnreadChangeRef = useRef(onUnreadChange);
  onUnreadChangeRef.current = onUnreadChange;

  const unreadCount = useMemo(() => items.filter((x) => !x.read).length, [items]);

  function formatTitle(n: NotificationItem) {
    return n.title || t('notifications.defaultTitle');
  }

  function errorToString(err: any): string {
    const apiErr = err?.response?.data?.error;
    if (typeof apiErr === "string") return apiErr;
    if (apiErr && typeof apiErr === "object") {
      if (typeof apiErr.message === "string") return apiErr.message;
    }
    if (typeof err?.message === "string") return err.message;
    try {
      return JSON.stringify(err);
    } catch {
      return t('common.somethingWentWrong');
    }
  }

  useEffect(() => {
    onUnreadChangeRef.current?.(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;

    const run = async () => {
      setLoading(true);
      setErrorState(null);
      try {
const res = await axiosCoin.get("/api/notifications");
        const rawList = getApiNotificationsPayload(res.data);
        const normalized = rawList.map(normalizeNotificationItem);
        if (!mounted) return;
        setItems(normalized);
        onMarkReadRef.current?.(normalized);
      } catch (e: any) {
        const msg = errorToString(e);
        if (!mounted) return;
        setErrorState(msg);
        toast.error(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [open]);

  async function markRead(n: NotificationItem) {
    if (n.read) return;
    // Optimistic update.
    setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
    try {
await axiosCoin.post(`/api/notifications/${encodeURIComponent(n._id)}/read`);
    } catch (e) {
      // rollback on failure
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: false } : x)));
    }
  }

  async function markAllRead() {
    try {
await axiosCoin.post("/api/notifications/read-all");
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
      toast.success(t('notifications.markAllReadSuccess'));
    } catch (e: any) {
      toast.error(errorToString(e));
    }
  }

  async function removeNotification(n: NotificationItem) {
    setDeleting(n._id);
    try {
await axiosCoin.delete(`/api/notifications/${encodeURIComponent(n._id)}`);
      setItems((prev) => prev.filter((x) => x._id !== n._id));
      toast.success(t('notifications.notificationDeleted'));
    } catch (e: any) {
      toast.error(errorToString(e));
    } finally {
      setDeleting(null);
    }
  }

  function handleOpen(n: NotificationItem) {
    markRead(n);
    if (n.link) {
      window.location.href = n.link;
    }
  }

  if (!open) return null;

  return (
    <div className="absolute right-0 mt-2 w-[420px] max-w-[92vw] rounded-xl bg-popover text-popover-foreground shadow-lg border border-border overflow-hidden z-50">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-foreground" />
          <div>
            <div className="font-semibold text-foreground">{t('notifications.title')}</div>
            <div className="text-xs text-muted-foreground">{unreadCount} {t('notifications.unread')}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {items.some((x) => !x.read) && (
            <button
              type="button"
              onClick={markAllRead}
              className="p-1.5 rounded-md hover:bg-gray-100"
              title={t('notifications.markAllAsRead')}
            >
              <CheckCheck size={16} className="text-gray-600" />
            </button>
          )}
          <button
            type="button"
            className="p-1 rounded-md hover:bg-gray-100"
            onClick={onClose}
            aria-label={t('ui.close')}
          >
            <X size={16} className="text-gray-700" />
          </button>
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto">
        {loading && (
          <div className="p-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-5/6 mt-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3 mt-2" />
              </div>
            ))}
          </div>
        )}

        {!loading && errorState && (
          <div className="p-4 text-sm text-destructive">{errorState}</div>
        )}

        {!loading && !errorState && items.length === 0 && (
          <div className="p-6 text-center">
            <div className="font-semibold">{t('notifications.noNotifications')}</div>
            <div className="text-sm text-muted-foreground mt-1">{t('notifications.signinPrompt')}</div>
          </div>
        )}

        {!loading && !errorState && items.length > 0 && (
          <div className="p-2">
            {items.map((n) => (
              <div
                key={n._id}
                className={`w-full text-left px-3 py-3 rounded-lg hover:bg-accent ${
                  n.read ? "bg-transparent" : "bg-accent/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    className="flex items-start gap-3 flex-1 text-left"
                    onClick={() => handleOpen(n)}
                  >
                    {(n.actor?.photo || n.actor?.name) ? (
                      <img
                        src={n.actor.photo || "https://via.placeholder.com/40"}
                        alt={n.actor.name || "User"}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Bell size={16} className="text-blue-600" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground">
                        {formatTitle(n)}
                        {n.actor?.verified && (
                          <span className="ml-1 text-blue-600 inline-flex">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2l2.4 4.8L20 8l-4 3.9.9 5.6L12 15l-4.9 2.5.9-5.6L4 8l5.6-1.2L12 2z" />
                            </svg>
                          </span>
                        )}
                      </div>
                      {n.actor?.name && (
                        <div className="text-xs text-gray-500">
                          {n.actor.name}
                          {n.actor.username ? ` · @${n.actor.username}` : ""}
                        </div>
                      )}
                      {typeof n.body === "string" && n.body ? (
                        <div className="text-sm text-foreground/90 mt-1">{n.body}</div>
                      ) : null}
                    </div>
                  </button>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <button
                      type="button"
                      aria-label={t('notifications.delete')}
                      onClick={() => removeNotification(n)}
                      disabled={deleting === n._id}
                      className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
        <div>{t('notifications.keepInSync')}</div>
      </div>
    </div>
  );
}

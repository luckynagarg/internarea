import React, { useEffect, useMemo, useRef, useState } from "react";
import axiosClient from "@/lib/apiClient";
import { Bell, X, CheckCheck } from "lucide-react";
import { toast } from "react-toastify";

export type NotificationItem = {
  _id: string;
  type:
    | "internship"
    | "application"
    | "admin_message"
    | "announcement"
    | "social"
    | "payment"
    | "subscription"
    | "resume"
    | string;
  title: string;
  body?: string;
  actor?: {
    _id: string;
    name: string | null;
    username: string | null;
    nickname: string | null;
    photo: string | null;
    headline: string | null;
    verified?: boolean;
  } | null;
  link?: string | null;
  action?: string | null;
  createdAt: string;
  read: boolean;
};

function formatTitle(n: NotificationItem) {
  return (
    n.title ||
    (n.type === "internship"
      ? "New internship posted"
      : n.type === "application"
        ? "Application status update"
        : n.type === "admin_message"
          ? "Message from admin"
          : n.type === "social"
            ? "Social update"
            : "Announcement")
  );
}

function getApiNotificationsPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.notifications)) return data.notifications;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function normalizeNotificationItem(raw: any): NotificationItem {
  // Backend canonical format: {_id,title,body,type,read,createdAt,actor,link,action}
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

  const actor =
    raw?.actor && typeof raw.actor === "object"
      ? {
          _id: raw.actor._id,
          name: raw.actor.name ?? null,
          username: raw.actor.username ?? null,
          nickname: raw.actor.nickname ?? null,
          photo: raw.actor.photo ?? null,
          headline: raw.actor.headline ?? null,
          verified: !!raw.actor.verified,
        }
      : null;

  return {
    _id,
    title,
    body,
    type,
    actor,
    link: raw?.link ?? null,
    action: raw?.action ?? null,
    createdAt,
    read,
  };
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
    return "Something went wrong";
  }
}

export default function NotificationDropdown({
  open,
  onClose,
  onMarkRead,
  onUnreadCountChange,
}: {
  open: boolean;
  onClose: () => void;
  onMarkRead?: (items: NotificationItem[]) => void;
  onUnreadCountChange?: (count: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [errorState, setErrorState] = useState<string | null>(null);

  const onMarkReadRef = useRef(onMarkRead);
  onMarkReadRef.current = onMarkRead;

  const unreadCount = useMemo(() => items.filter((x) => !x.read).length, [items]);

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    const run = async () => {
      setLoading(true);
      setErrorState(null);

      try {
        const res = await axiosClient.get("/api/notifications", {
          params: { limit: 30 },
        });

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

  const handleMarkOneRead = async (n: NotificationItem) => {
    // Optimistic update.
    setItems((prev) =>
      prev.map((x) => (x._id === n._id ? { ...x, read: true } : x))
    );
    onMarkRead?.(
      items.map((x) => (x._id === n._id ? { ...x, read: true } : x))
    );

    try {
      await axiosClient.post(`/api/notifications/${n._id}/read`);
    } catch (e: any) {
      toast.error("Couldn't mark as read.");
      // rollback
      setItems((prev) =>
        prev.map((x) => (x._id === n._id ? { ...x, read: false } : x))
      );
    }
  };

  const handleMarkAllRead = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    onMarkRead?.(items.map((x) => ({ ...x, read: true })));
    try {
      await axiosClient.post("/api/notifications/read-all");
      toast.success("All notifications marked as read.");
    } catch (e: any) {
      toast.error("Couldn't mark all as read.");
    }
  };

  if (!open) return null;

  return (
    <div className="absolute right-0 mt-2 w-[420px] max-w-[92vw] rounded-xl bg-popover text-popover-foreground shadow-lg border border-border overflow-hidden z-50">
      <div className="px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-foreground" />
          <div>
            <div className="font-semibold text-foreground">Notifications</div>
            <div className="text-xs text-muted-foreground">{unreadCount} unread</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="p-1 rounded-md hover:bg-gray-100 text-xs text-blue-600 inline-flex items-center gap-1"
              aria-label="Mark all as read"
            >
              <CheckCheck size={14} />
              Mark all
            </button>
          )}
          <button
            type="button"
            className="p-1 rounded-md hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close notifications"
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
            <div className="font-semibold">No notifications yet.</div>
            <div className="text-sm text-muted-foreground mt-1">
              You&apos;ll see updates here.
            </div>
          </div>
        )}

        {!loading && !errorState && items.length > 0 && (
          <div className="p-2">
            {items.map((n) => (
              <button
                key={n._id}
                type="button"
                className={`w-full text-left px-3 py-3 rounded-lg hover:bg-accent ${
                  n.read ? "bg-transparent" : "bg-accent/50"
                }`}
                onClick={() => handleMarkOneRead(n)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    {n.actor?.photo ? (
                      <img
                        src={n.actor.photo}
                        alt={n.actor.name || "User"}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground text-sm">
                        {formatTitle(n)}
                        {n.actor?.verified && (
                          <span className="ml-1 text-blue-500 text-xs" title="Verified">
                            ✓
                          </span>
                        )}
                      </div>
                      {typeof n.body === "string" && n.body ? (
                        <div className="text-sm text-foreground/90 mt-1">{n.body}</div>
                      ) : null}
                      {n.actor?.nickname && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          @{n.actor.nickname}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
        Real-time sync is handled via the notification API.
      </div>
    </div>
  );
}

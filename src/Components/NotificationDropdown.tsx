import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Bell, X } from "lucide-react";
import { toast } from "react-toastify";
import { auth } from "../firebase/firebase";


export type NotificationItem = {
  _id: string;
  type: "internship" | "application" | "admin_message" | "announcement";
  title: string;
  body?: string;
  createdAt: string;
  read: boolean;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_BASE_URL ||
  "https://intern-backend-4dlt.onrender.com";

function formatTitle(n: NotificationItem) {
  return n.title ||
    (n.type === "internship"
      ? "New internship posted"
      : n.type === "application"
        ? "Application status update"
        : n.type === "admin_message"
          ? "Message from admin"
          : "Announcement");
}

export default function NotificationDropdown({
  open,
  onClose,
  onMarkRead,
}: {
  open: boolean;
  onClose: () => void;
  onMarkRead: (items: NotificationItem[]) => void;
}) {

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [errorState, setErrorState] = useState<string | null>(null);

  const unreadCount = useMemo(() => items.filter((x) => !x.read).length, [items]);

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    const run = async () => {
      setLoading(true);
      setErrorState(null);
      try {
        // Firebase auth is required by backend
        const token = await auth.currentUser?.getIdToken();

        const res = await axios.get(`${API_BASE}/api/notifications`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const data = res.data?.notifications || res.data?.items || res.data?.data || [];
        if (!mounted) return;

        setItems(data);
        onMarkRead(data);
      } catch (e: any) {
        if (!mounted) return;
        const msg = e?.response?.data?.error || e.message || "Failed to load notifications";
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
  }, [open, onMarkRead]);

  if (!open) return null;

  return (
    <div className="absolute right-0 mt-2 w-[420px] max-w-[92vw] rounded-xl bg-white shadow-lg border overflow-hidden z-50">
      <div className="px-4 py-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-gray-800" />
          <div>
            <div className="font-semibold text-gray-900">Notifications</div>
            <div className="text-xs text-gray-500">{unreadCount} unread</div>
          </div>
        </div>
        <button
          type="button"
          className="p-1 rounded-md hover:bg-gray-100"
          onClick={onClose}
          aria-label="Close notifications"
        >
          <X size={16} className="text-gray-700" />
        </button>
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
          <div className="p-4 text-sm text-red-600">{errorState}</div>
        )}

        {!loading && !errorState && items.length === 0 && (
          <div className="p-6 text-center">
            <div className="text-gray-800 font-semibold">No notifications yet.</div>
            <div className="text-sm text-gray-500 mt-1">You’ll see updates here.</div>
          </div>
        )}

        {!loading && !errorState && items.length > 0 && (
          <div className="p-2">
            {items.map((n) => (
              <button
                key={n._id}
                type="button"
                className={`w-full text-left px-3 py-3 rounded-lg hover:bg-gray-50 ${
                  n.read ? "bg-white" : "bg-amber-50"
                }`}
                onClick={() => {
                  // marking read is handled outside for now to keep API wiring centralized
                  // but we still visually respond by optimistic mark.
                  onMarkRead(
                    items.map((x) => (x._id === n._id ? { ...x, read: true } : x))
                  );
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900">{formatTitle(n)}</div>
                    {n.body ? <div className="text-sm text-gray-700 mt-1">{n.body}</div> : null}
                  </div>
                  <div className="text-[11px] text-gray-500 whitespace-nowrap">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t text-xs text-gray-500">
        <div>
          {"To enable real-time notifications, connect this UI to the backend API."}
        </div>
      </div>
    </div>
  );
}


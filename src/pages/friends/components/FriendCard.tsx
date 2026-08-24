import React, { useMemo, useState } from "react";
import { useT } from "@/i18n/runtime";
import {
  MoreVertical,
  UserPlus,
  Clock,
  Check,
  X,
} from "lucide-react";

export type FriendCardModel = {
  _id: string;

  name: string | null;
  username: string | null;
  nickname: string | null;

  photo: string | null;

  headline: string | null;
  bio?: string | null;
  location?: string | null;

  // Education / professional information
  college?: string | null;
  company?: string | null;

  mutualFriends?: number;
  friendCount?: number;

  isFriend: boolean;

  relationship?:
    | "none"
    | "request_sent"
    | "request_received"
    | "friends";

  uid?: string;
};

type Props = {
  friend: FriendCardModel;
  onEditNickname?: (friend: FriendCardModel) => void;
  onRemove?: (friend: FriendCardModel) => void;
  onAdd?: (friend: FriendCardModel) => void;
  onAccept?: (friend: FriendCardModel) => void;
  onReject?: (friend: FriendCardModel) => void;
  onCancel?: (friend: FriendCardModel) => void;
  removing?: boolean;
  actionLoading?: boolean;
};

const FALLBACK_IMG = "https://via.placeholder.com/64";

export default function FriendCard({
  friend,
  onEditNickname,
  onRemove,
  onAdd,
  onAccept,
  onReject,
  onCancel,
  removing,
  actionLoading,
}: Props) {
  const { t } = useT();

  const [open, setOpen] = useState(false);

  const safeFriend = friend ?? ({} as FriendCardModel);

  const safeName =
    safeFriend.nickname ||
    safeFriend.name ||
    "Unknown";

  const rel =
    safeFriend.relationship ??
    (safeFriend.isFriend ? "friends" : "none");

  const menu = useMemo(() => {
    if (!open) return null;

    return (
      <div className="absolute right-2 top-9 z-10 w-44 rounded-lg border bg-white p-1 shadow-md">
        <button
          type="button"
          className="w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
          onClick={() => {
            setOpen(false);
            onEditNickname?.(friend);
          }}
        >
          {t("common.editNickname")}
        </button>

        <button
          type="button"
          className="w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
          onClick={() => setOpen(false)}
        >
          {t("common.viewProfile")}
        </button>

        <button
          type="button"
          className="w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
          onClick={() => {
            setOpen(false);
            onRemove?.(friend);
          }}
          disabled={!!removing}
        >
          {removing
            ? t("common.removing")
            : t("common.removeFriend")}
        </button>
      </div>
    );
  }, [
    open,
    friend,
    onEditNickname,
    onRemove,
    removing,
    t,
  ]);

  function renderAction() {
    if (rel === "friends") {
      return (
        <div className="relative">
          <button
            type="button"
            aria-label={t("common.manage")}
            className="rounded p-1 hover:bg-gray-100"
            onClick={() => setOpen((value) => !value)}
          >
            <MoreVertical
              size={18}
              className="text-gray-500"
            />
          </button>

          {menu}
        </div>
      );
    }

    if (rel === "request_sent") {
      return (
        <button
          type="button"
          disabled={actionLoading}
          onClick={() => onCancel?.(friend)}
          className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 disabled:opacity-50"
        >
          <Clock size={14} />

          {t("common.requested")}
        </button>
      );
    }

    if (rel === "request_received") {
      return (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onAccept?.(friend)}
            className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100 disabled:opacity-50"
          >
            <Check size={14} />

            {t("common.accept")}
          </button>

          <button
            type="button"
            disabled={actionLoading}
            onClick={() => onReject?.(friend)}
            className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            <X size={14} />

            {t("common.reject")}
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        disabled={actionLoading}
        onClick={() => onAdd?.(friend)}
        className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 disabled:opacity-50"
      >
        <UserPlus size={14} />

        {t("common.add")}
      </button>
    );
  }

  return (
    <div className="relative flex items-center gap-3 rounded-lg border p-3">
      <img
        src={safeFriend.photo || FALLBACK_IMG}
        alt={safeFriend.name || t("friends.friend")}
        className="h-10 w-10 rounded-full object-cover"
      />

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-gray-900">
          {safeName}
        </div>

        {safeFriend.username ? (
          <div className="truncate text-xs text-gray-500">
            @{safeFriend.username}
          </div>
        ) : null}

        {safeFriend.headline ? (
          <div className="truncate text-xs text-gray-500">
            {safeFriend.headline}
          </div>
        ) : safeFriend.bio ? (
          <div className="truncate text-xs text-gray-500">
            {safeFriend.bio}
          </div>
        ) : null}

        {(safeFriend.location ||
          safeFriend.college ||
          safeFriend.company) && (
          <div className="truncate text-xs text-gray-400">
            {[
              safeFriend.location,
              safeFriend.college || safeFriend.company,
            ]
              .filter(Boolean)
              .join(" • ")}
          </div>
        )}

        {(safeFriend.mutualFriends ?? 0) > 0 && (
          <div className="truncate text-xs text-gray-400">
            {safeFriend.mutualFriends ?? 0}{" "}
            {t("friends.connections", {
              values: {
                count: safeFriend.mutualFriends ?? 0,
              },
            })}
          </div>
        )}
      </div>

      {renderAction()}
    </div>
  );
}
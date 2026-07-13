import React, { useMemo, useState } from "react";
import { MoreVertical } from "lucide-react";

export type FriendCardModel = {
  _id: string;
  name: string | null;
  username: string | null;
  nickname: string | null;
  photo: string | null;
  headline: string | null;
  isFriend: boolean;
};

type Props = {
  friend: FriendCardModel;
  onEditNickname?: (friend: FriendCardModel) => void;
};

export default function FriendCard({ friend, onEditNickname }: Props) {
  const [open, setOpen] = useState(false);
  const safeName = friend.nickname || friend.name || "Unknown";


  const menu = useMemo(() => {
    if (!open) return null;
    return (
      <div className="absolute right-2 top-9 bg-white border rounded-lg shadow-md p-1 z-10 w-44">
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded"
          onClick={() => {
            setOpen(false);
            onEditNickname?.(friend);
          }}
        >
          Edit Nickname

        </button>
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded"
          onClick={() => setOpen(false)}
        >
          View Profile
        </button>
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 rounded text-red-600"
          onClick={() => setOpen(false)}
        >
          Remove Friend
        </button>
      </div>
    );
  }, [open, friend, onEditNickname]);

  return (
    <div className="border rounded-lg p-3 relative">
      <div className="flex items-center gap-3">
        <img
          src={friend.photo || "https://via.placeholder.com/64"}
          alt={friend.name || "Friend"}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {safeName}
          </div>
          {friend.name && friend.nickname && friend.nickname !== friend.name ? (
            <div className="text-xs text-gray-500 truncate">{friend.name}</div>
          ) : (
            <div className="text-xs text-gray-500 truncate">{friend.headline || friend.username || ""}</div>
          )}
          <div className="text-xs text-gray-500 truncate">@{friend.username || ""}</div>
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="More"
            className="p-1 rounded hover:bg-gray-100"
            onClick={() => setOpen((v) => !v)}
          >
            <MoreVertical size={18} className="text-gray-500" />
          </button>
          {menu}
        </div>
      </div>
    </div>
  );
}


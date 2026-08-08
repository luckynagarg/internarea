import React, { useEffect, useMemo, useRef, useState } from "react";
import axiosClient from "@/lib/apiClient";
import { Search, X } from "lucide-react";


export type FriendSearchResult = {
  _id: string;
  uid?: string;
  name: string | null;
  username: string | null;
  nickname: string | null;
  photo: string | null;
  headline: string | null;
  bio?: string | null;
  mutualFriends?: number;
  friendCount?: number;
  isFriend: boolean;
  relationship?: "none" | "request_sent" | "request_received" | "friends";
};

type Props = {
  apiBase: string;
  initialQuery?: string;
  onResults: (results: FriendSearchResult[], q: string) => void;
  onLoading?: (loading: boolean) => void;
};

export default function FriendSearch({
  apiBase,
  initialQuery = "",
  onResults,
  onLoading,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (onLoading) onLoading(loading);
  }, [loading, onLoading]);

  useEffect(() => {
    if (!trimmed) {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
      setLoading(false);
      onResults([], "");
      return;
    }

    if (trimmed.length < 1) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        // Use axiosClient so the backend base URL + Firebase auth token are
        // applied automatically regardless of the frontend origin.
        const res = await axiosClient.get<{
          data: FriendSearchResult[];
        }>("/api/users/search", {
          params: { q: trimmed, limit: 20 },
          signal: controller.signal,
        });

        const raw = res.data?.data || [];
        const normalized = raw.map((u) => ({
          ...u,
          isFriend: u.relationship === "friends",
        }));
        onResults(normalized, trimmed);
      } catch (e: any) {
        if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return;
        onResults([], trimmed);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [trimmed, apiBase, onResults]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setQuery("");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex items-center gap-2 mb-4">
      <Search size={18} className="text-gray-400" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search people by name or @nickname..."
        className="w-full border rounded-lg px-3 py-2 text-sm text-black"
      />

      {query.length > 0 ? (
        <button
          type="button"
          aria-label="Clear"
          className="p-1 text-gray-500 hover:text-gray-700"
          onClick={() => setQuery("")}
        >
          <X size={16} />
        </button>
      ) : null}

      {loading ? (
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      ) : null}
    </div>
  );
}

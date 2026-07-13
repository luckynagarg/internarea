import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Search, X } from "lucide-react";
import { getAuthHeaders } from "@/lib/authHeaders";


export type FriendSearchResult = {
  _id: string;
  name: string | null;
  username: string | null;
  nickname: string | null;
  photo: string | null;
  headline: string | null;
  isFriend: boolean;
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
    // Clear results when empty
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
      // cancel previous
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const res = await axios.get<{
          data: FriendSearchResult[];
        }>(`${apiBase}/api/friends/search`, {
          params: { q: trimmed },
          signal: controller.signal,
          headers: await getAuthHeaders(),
        });


        onResults(res.data?.data || [], trimmed);
      } catch (e: any) {
        if (axios.isCancel?.(e)) return;
        if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return;
        // keep UI stable; report as empty
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
      if (e.key === "Escape") {
        setQuery("");
      }
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
        placeholder="Search friends..."
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


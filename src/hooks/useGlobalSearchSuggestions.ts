import { useEffect, useMemo, useState } from "react";
import { searchAllEntities } from "@/services/searchService";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export type GlobalSearchSuggestion = {
  type: "internship" | "job" | "company";
  id: string;
  title: string;
  subtitle?: string;
};

export function useGlobalSearchSuggestions(term: string) {
  const debouncedTerm = useDebouncedValue(term, 250);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<GlobalSearchSuggestion[]>([]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      const q = String(debouncedTerm || "").trim();
      if (!q) {
        if (!mounted) return;
        setSuggestions([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await searchAllEntities(q);
        if (!mounted) return;

        const next: GlobalSearchSuggestion[] = [
          ...data.internships.map((it) => ({
            type: "internship" as const,
            id: it._id,
            title: it.title,
            subtitle: it.company,
          })),
          ...data.jobs.map((j) => ({
            type: "job" as const,
            id: j._id,
            title: j.title,
            subtitle: j.company,
          })),
          ...data.companies.map((c, idx) => ({
            type: "company" as const,
            id: `${c}-${idx}`,
            title: c,
          })),
        ];

        setSuggestions(next.slice(0, 8));
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Search failed");
        setSuggestions([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [debouncedTerm]);

  const hasSuggestions = useMemo(() => suggestions.length > 0, [suggestions]);

  return { loading, error, suggestions, hasSuggestions };
}


import { useRouter } from "next/router";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, MapPin, Calendar, Search as SearchIcon } from "lucide-react";
import { searchAllEntities, type SearchInternship, type SearchJob } from "@/services/searchService";

type SearchState = {
  internships: SearchInternship[];
  jobs: SearchJob[];
  companies: string[];
};

export default function SearchPage() {
  const router = useRouter();
  const queryFromUrl =
    typeof router.query.query === "string" ? router.query.query : "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState(queryFromUrl);
  const [debouncedQuery, setDebouncedQuery] = useState(queryFromUrl);

  const [results, setResults] = useState<SearchState>({
    internships: [],
    jobs: [],
    companies: [],
  });

  useEffect(() => {
    // Sync from URL only when it actually differs from the current query.
    // This prevents an infinite render loop when typing updates the URL.
    setQ((prev) => (prev === queryFromUrl ? prev : queryFromUrl));
    setDebouncedQuery((prev) => (prev === queryFromUrl ? prev : queryFromUrl));
  }, [queryFromUrl]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(q);
    }, 250);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let mounted = true;

    async function run() {
      const query = String(debouncedQuery || "").trim();
      if (!query) {
        if (!mounted) return;
        setResults({ internships: [], jobs: [], companies: [] });
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await searchAllEntities(query);
        if (!mounted) return;
        setResults(data);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Search failed");
        setResults({ internships: [], jobs: [], companies: [] });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [debouncedQuery]);

  const totalCount = results.internships.length + results.jobs.length;


  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-background rounded-full px-4 py-2 flex items-center w-full max-w-2xl border border-border">
              <SearchIcon size={16} className="text-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                type="text"
                className="ml-3 bg-transparent w-full focus:outline-none text-sm text-foreground placeholder:text-muted-foreground"
                placeholder="Search opportunities... (title, company, location, category)"
              />
            </div>
            <button
              type="button"
              onClick={() => router.push(`/search?query=${encodeURIComponent(q)}`)}
              className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
            >
              Search
            </button>
          </div>

          <div className="mt-3 text-sm text-gray-800">
            {loading ? (
              "Loading results…"
            ) : error ? (
              <span className="text-red-600">{error}</span>
            ) : (
              `${totalCount} results found`
            )}
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4">Internships</h2>
            {results.internships.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-gray-600">
                {loading ? "" : "No matching internships."}
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {results.internships.map((item) => (
                  <div
                    key={item._id}
                    className="bg-white p-5 rounded shadow hover:scale-105 transition"
                  >
                    <h3 className="font-bold mt-2">{item.title}</h3>
                    <p className="text-gray-800">{item.company}</p>

                    <div className="mt-3 text-sm space-y-2">
                      <p className="flex items-center gap-2">
                        <MapPin size={14} /> {item.location}
                      </p>
                      {item.stipend ? (
                        <p className="flex items-center gap-2">
                          <span className="font-medium">Stipend:</span> {item.stipend}
                        </p>
                      ) : null}
                      {item.duration ? (
                        <p className="flex items-center gap-2">
                          <Calendar size={14} /> {item.duration}
                        </p>
                      ) : null}
                    </div>

<Link
                      href={`/detailinternship/${item._id}`}
                      className="text-blue-600 mt-3 block inline-flex items-center gap-1"
                    >
                      View details <ArrowUpRight size={16} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4">Jobs</h2>
            {results.jobs.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-gray-800">
                {loading ? "" : "No matching jobs."}
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {results.jobs.map((job) => (
                  <div
                    key={job._id}
                    className="bg-white p-5 rounded shadow hover:scale-105 transition"
                  >
                    <h3 className="font-bold mt-2">{job.title}</h3>
                    <p className="text-gray-500">{job.company}</p>

                    <div className="mt-3 text-sm space-y-2">
                      <p className="flex items-center gap-2">
                        <MapPin size={14} /> {job.location}
                      </p>
                      {job.CTC ? (
                        <p className="flex items-center gap-2">
                          <span className="font-medium">CTC:</span> {job.CTC}
                        </p>
                      ) : null}
                      {job.Experience ? (
                        <p className="flex items-center gap-2">
                          <Calendar size={14} /> {job.Experience}
                        </p>
                      ) : null}
                    </div>

                    <Link
                      href={`/detailjob/${job._id}`}
                      className="text-blue-600 mt-3 block inline-flex items-center gap-1"
                    >
                      View details <ArrowUpRight size={16} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

      </div>
    </div>
  );
}


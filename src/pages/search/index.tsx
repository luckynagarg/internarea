import axios from "axios";
import { useRouter } from "next/router";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, MapPin, Calendar, Search as SearchIcon } from "lucide-react";

type Internship = {
  _id: string;
  title: string;
  company: string;
  location: string;
  stipend: string;
  duration: string;
  category: string;
};

type Job = {
  _id: string;
  title: string;
  company: string;
  location: string;
  CTC: string;
  Experience: string;
  category: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://intern-backend-4dlt.onrender.com";

function normalize(s: string) {
  return s.toLowerCase().trim();
}

function matchesAnyField({
  haystack,
  query,
}: {
  haystack: string[];
  query: string;
}) {
  const q = normalize(query);
  if (!q) return true;
  return haystack.some((field) => normalize(field).includes(q));
}

export default function SearchPage() {
  const router = useRouter();
  const queryFromUrl = typeof router.query.query === "string" ? router.query.query : "";

  const [internships, setInternships] = useState<Internship[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(queryFromUrl);
  const [debouncedQuery, setDebouncedQuery] = useState(queryFromUrl);

  useEffect(() => {
    setQ(queryFromUrl);
    setDebouncedQuery(queryFromUrl);
  }, [queryFromUrl]);

  // Debounce typing so we don't recompute too aggressively.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(q);
    }, 200);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [internshipRes, jobRes] = await Promise.all([
          axios.get(`${API_BASE}/api/internship`),
          axios.get(`${API_BASE}/api/job`),
        ]);

        if (!mounted) return;
        setInternships(internshipRes.data?.data || internshipRes.data || []);
        setJobs(jobRes.data?.data || jobRes.data || []);
      } catch (e) {
        // Keep UI stable even if backend is unavailable
        console.error("Search fetch error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  // Live results (while typing)
  const filteredInternships = useMemo(() => {
    if (loading) return [];
    return internships.filter((item) =>
      matchesAnyField({
        query: debouncedQuery,
        haystack: [
          item.title,
          item.company,
          item.location,
          item.category,
        ],
      })
    );
  }, [debouncedQuery, internships, loading]);

  const filteredJobs = useMemo(() => {
    if (loading) return [];
    return jobs.filter((job) =>
      matchesAnyField({
        query: debouncedQuery,
        haystack: [job.title, job.company, job.location, job.category],
      })
    );
  }, [debouncedQuery, jobs, loading]);

  const totalCount = filteredInternships.length + filteredJobs.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 rounded-full px-4 py-2 flex items-center w-full max-w-2xl">
              <SearchIcon size={16} className="text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                type="text"
                className="ml-3 bg-transparent w-full focus:outline-none text-sm"
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

          <div className="mt-3 text-sm text-gray-600">
            {loading ? "Loading results…" : `${totalCount} results found`}
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4">Internships</h2>
            {filteredInternships.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-gray-600">
                No matching internships.
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {filteredInternships.map((item) => (
                  <div
                    key={item._id}
                    className="bg-white p-5 rounded shadow hover:scale-105 transition"
                  >
                    <h3 className="font-bold mt-2">{item.title}</h3>
                    <p className="text-gray-500">{item.company}</p>

                    <div className="mt-3 text-sm space-y-2">
                      <p className="flex items-center gap-2">
                        <MapPin size={14} /> {item.location}
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="font-medium">Stipend:</span> {item.stipend}
                      </p>
                      <p className="flex items-center gap-2">
                        <Calendar size={14} /> {item.duration}
                      </p>
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
            {filteredJobs.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-6 text-gray-600">
                No matching jobs.
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {filteredJobs.map((job) => (
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
                      <p className="flex items-center gap-2">
                        <span className="font-medium">CTC:</span> {job.CTC}
                      </p>
                      <p className="flex items-center gap-2">
                        <Calendar size={14} /> {job.Experience}
                      </p>
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


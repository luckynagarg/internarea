import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Star, Building2, Search, ArrowUpRight } from 'lucide-react';
import axiosClient from '@/lib/apiClient';

type Company = {
  _id: string;
  name: string;
  industry: string;
  description: string;
  rating: number;
  logo: string;
  openInternships: number;
  openJobs: number;
};

export default function CompaniesPage() {
  const [query, setQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await axiosClient.get('/api/companies', { skipAuth: true } as any);
        const arr = res?.data?.data ?? res?.data?.companies ?? res?.data ?? [];
        if (!mounted) return;
        setCompanies(Array.isArray(arr) ? arr : []);
        setError(null);
      } catch (e) {
        if (!mounted) return;
        setError('Could not load companies. Please try again.');
        setCompanies([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? companies
      : companies.filter(
          (c) =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.industry || '').toLowerCase().includes(q)
        );
    return filtered.slice(0, 60);
  }, [companies, query]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building2 className="text-blue-600" /> Companies
            </h1>
            <p className="text-gray-600 mt-1">Companies hiring on Internarea, with open roles count.</p>
          </div>
          <div className="text-sm text-gray-500">{visible.length} shown</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex items-center gap-3">
          <Search className="text-gray-400" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies by name or industry..."
            className="flex-1 border-none outline-none text-sm"
          />
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-gray-500">Loading companies...</div>
        ) : error ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-red-600">{error}</div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-gray-500">
            No companies found.
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {visible.map((c) => (
              <div key={c._id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    {c.logo ? (
                      <img src={c.logo} alt={c.name} className="w-12 h-12 object-contain rounded bg-gray-50" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {(c.name || '?').charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.industry || 'Recruiting'}</div>
                    </div>
                  </div>
                  {typeof c.rating === 'number' && c.rating > 0 ? (
                    <div className="flex items-center gap-1 text-sm text-yellow-600">
                      <Star size={16} /> {c.rating.toFixed(1)}
                    </div>
                  ) : null}
                </div>
                <div className="text-sm text-gray-600 mb-3">{c.description}</div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <div>{c.openInternships} open internships</div>
                  <div className="px-2 py-1 bg-gray-50 rounded">{c.openJobs} jobs</div>
                </div>

                <Link href="/internship" className="text-blue-600 inline-flex items-center gap-1 text-sm font-semibold">
                  View internships <ArrowUpRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

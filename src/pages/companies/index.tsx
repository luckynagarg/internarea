import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { mockData, MockCompany, MockUser } from '@/mockData';
import { fetchOrMock } from '@/mockData/fetchOrMock';
import { Star, Building2, Search, ArrowUpRight } from 'lucide-react';


const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000';

export default function CompaniesPage() {
  const [query, setQuery] = useState('');
  const [companies, setCompanies] = useState<MockCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const data = await fetchOrMock<MockCompany[]>({
        url: `${API_BASE}/api/companies`,
        mock: () => mockData.companies,
        transform: (d) => {
          const arr = d?.data?.companies ?? d?.data ?? d?.companies ?? d;
          return Array.isArray(arr) ? arr : [];
        },
      });

      if (!mounted) return;
      setCompanies(data);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = companies.length ? companies : mockData.companies;
    const filtered = !q
      ? base
      : base.filter((c) => c.name.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q));
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
            <p className="text-gray-600 mt-1">100+ companies, each with internships count and rating.</p>
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
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {visible.map((c) => (
              <div key={c._id} className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition">
                <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
                    <img src={c.logo} alt={c.name} className="w-12 h-12 object-contain rounded bg-gray-50" />
                    <div>
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.industry}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-yellow-600">
                    <Star size={16} /> {c.rating.toFixed(1)}
                  </div>
                </div>
                <div className="text-sm text-gray-600 mb-3">{c.description}</div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <div>{c.openInternships} open internships</div>
                  <div className="px-2 py-1 bg-gray-50 rounded">Live roles</div>
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


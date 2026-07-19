import axios from "axios";
import type { AxiosError } from "axios";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:5000";

export type SearchInternship = {
  _id: string;
  title: string;
  company: string;
  location: string;
  stipend?: string;
  category?: string;
  duration?: string;
};

export type SearchJob = {
  _id: string;
  title: string;
  company: string;
  location: string;
  CTC?: string;
  Experience?: string;
  category?: string;
};

export type SearchResponse = {
  internships: SearchInternship[];
  jobs: SearchJob[];
  companies: string[];
};

export async function searchAllEntities(query: string): Promise<SearchResponse> {
  const q = String(query || "").trim();
  if (!q) return { internships: [], jobs: [], companies: [] };

  try {
    const res = await axios.get(`${API_BASE}/api/search`, {
      params: { query: q },
    });

    // Backend currently returns { internships, jobs, companies }
    // Keep resilient to other shapes.
    return {
      internships: res.data?.internships ?? [],
      jobs: res.data?.jobs ?? [],
      companies: res.data?.companies ?? [],
    };
  } catch (err) {
    const e = err as AxiosError;
    const msg =
      // backend error shape: { error: 'internal server error' }
      (e.response?.data as any)?.error ||
      // fallback: backend may return raw text/other fields
      (typeof e.response?.data === "string" ? e.response?.data : undefined) ||
      e.message ||
      "Search failed";

    // Expose error in UI via thrown message.
    throw new Error(msg);
  }

}


import axios from "axios";

// Reusable helper: calls API, falls back to provided mock when response is empty/fails.

export type FallbackFactory<T> = () => T;

function isEmptyValue(x: any) {
  if (x == null) return true;
  if (Array.isArray(x)) return x.length === 0;
  if (typeof x === 'object') {
    // treat { data: [] } style carefully
    const keys = Object.keys(x);
    if (keys.length === 0) return true;
  }
  return false;
}

export async function fetchOrMock<T>(args: {
  url: string;
  mock: FallbackFactory<T>;
  transform?: (data: any) => T;
}): Promise<T> {
  try {
    const res = await axios.get(args.url);
    const data = res?.data;

    if (args.transform) {
      const out = args.transform(data);
      return isEmptyValue(out) ? args.mock() : out;
    }

    // common patterns: { data: [...] } or [...] or {posts: [...]}
    // if caller wants that shape, they should provide transform.
    if (!isEmptyValue(data)) return data as T;
  } catch {
    // ignore
  }

  return args.mock();
}

export async function postOrMock<T>(args: {
  url: string;
  body: any;
  mock: FallbackFactory<T>;
  transform?: (data: any) => T;
}): Promise<T> {
  try {
    const res = await axios.post(args.url, args.body);
    const data = res?.data;
    if (args.transform) {
      const out = args.transform(data);
      return isEmptyValue(out) ? args.mock() : out;
    }
    if (!isEmptyValue(data)) return data as T;
  } catch {
    // ignore
  }
  return args.mock();
}


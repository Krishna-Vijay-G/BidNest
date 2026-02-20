//src/lib/api.ts
// (placeholder) central api helpers
export async function fetchJson(url: string, opts?: RequestInit) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error('Network error');
  return res.json();
}

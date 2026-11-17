// Pure helpers (no Next imports) so they can be unit-tested in plain Node.
export type ApiMeta = { total?: number; page?: number; page_size?: number };

const BASE_HEADERS = { 'X-Content-Type-Options': 'nosniff' };
export const CACHE_PUBLIC = 'public, s-maxage=60, stale-while-revalidate=300';

/** Success envelope: { data, meta? } */
export function apiOk<T>(data: T, opts: { status?: number; meta?: ApiMeta; cache?: string } = {}): Response {
  return Response.json(opts.meta ? { data, meta: opts.meta } : { data }, { status: opts.status ?? 200, headers: { ...BASE_HEADERS, 'Cache-Control': opts.cache ?? 'no-store' } });
}
/** Error envelope: { error: { code, message } } */
export function apiError(status: number, code: string, message: string, extra: Record<string, string> = {}): Response {
  return Response.json({ error: { code, message } }, { status, headers: { ...BASE_HEADERS, 'Cache-Control': 'no-store', ...extra } });
}

type Rel = { name: string; slug: string } | null;
/** Whitelist of fields exposed by the public API (never internal verification details, flags or timestamps of deletion). */
export function toPublicStation(s: Record<string, unknown>) {
  const pick = (k: string) => (s[k] ?? null);
  return {
    id: pick('id'), slug: pick('slug'), name: pick('name'), short_description: pick('short_description'), description: pick('description'),
    city: pick('city'), language: pick('language'), stream_url: pick('stream_url'), stream_format: pick('stream_format'),
    logo_url: pick('logo_url'), website_url: pick('website_url'), social_links: pick('social_links'),
    is_featured: Boolean(s.is_featured), verified: s.verification_status === 'verified' || s.verification_status === 'manual',
    published_at: pick('published_at'), country: (s.country as Rel) ?? null, category: (s.category as Rel) ?? null,
  };
}

import { describe, expect, it } from 'vitest';
import { apiError, apiOk, toPublicStation } from '@/lib/api';
import { apiSlugSchema, apiStationsQuerySchema } from '@/lib/validation/api-schemas';

describe('API envelopes', () => {
  it('apiOk wraps data and meta and is no-store by default', async () => {
    const r = apiOk([1], { meta: { total: 1, page: 1, page_size: 20 } });
    expect(r.status).toBe(200); expect(r.headers.get('cache-control')).toBe('no-store');
    expect(await r.json()).toEqual({ data: [1], meta: { total: 1, page: 1, page_size: 20 } });
  });
  it('apiError uses the error envelope and extra headers', async () => {
    const r = apiError(429, 'rate_limited', 'x', { 'Retry-After': '60' });
    expect(r.status).toBe(429); expect(r.headers.get('retry-after')).toBe('60');
    expect(await r.json()).toEqual({ error: { code: 'rate_limited', message: 'x' } });
  });
});
describe('toPublicStation whitelist', () => {
  const row = { id: 'i', slug: 's', name: 'N', stream_url: 'https://x/y', verification_status: 'manual', is_featured: true, is_demo: true, deleted_at: null, status: 'published',
    last_verification_result: { verified_by: 'Ana' }, display_order: 3, country: { name: 'Chile', slug: 'chile' } };
  it('never leaks internal fields', () => {
    const o = toPublicStation(row) as Record<string, unknown>;
    for (const k of ['is_demo', 'deleted_at', 'status', 'last_verification_result', 'display_order', 'verification_status']) expect(k in o).toBe(false);
    expect(o.verified).toBe(true); expect(o.country).toEqual({ name: 'Chile', slug: 'chile' });
  });
});
describe('API query schema', () => {
  it('clamps and defaults instead of throwing', () => {
    const q = apiStationsQuerySchema.parse({ limite: '9999', pagina: '-3', destacadas: 'maybe', orden: 'zzz' });
    expect(q.limite).toBe(20); expect(q.pagina).toBe(1); expect(q.destacadas).toBeUndefined(); expect(q.orden).toBe('name');
  });
  it('accepts valid limits and featured flag', () => { const q = apiStationsQuerySchema.parse({ limite: '5', destacadas: 'true' }); expect(q.limite).toBe(5); expect(q.destacadas).toBe('true'); });
  it('slug validation', () => { expect(apiSlugSchema.safeParse('radio-fe').success).toBe(true); expect(apiSlugSchema.safeParse('../etc').success).toBe(false); });
});

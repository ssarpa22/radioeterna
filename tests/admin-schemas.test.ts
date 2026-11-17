import { describe, expect, it } from 'vitest';
import { categoryInputSchema, countryInputSchema, loginSchema, settingsSchema, stationInputSchema, submissionEditSchema } from '@/lib/validation/admin-schemas';

const id = () => crypto.randomUUID();
const station = () => ({ name: 'Radio Fe', country_id: id(), primary_category_id: id(), stream_url: 'https://x.org/live', language: 'es' });

describe('stationInputSchema', () => {
  it('accepts a minimal valid station and normalizes empties', () => {
    const r = stationInputSchema.safeParse({ ...station(), slug: '', city: '', logo_url: '', stream_format: '', display_order: 'abc' });
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.slug).toBeUndefined(); expect(r.data.city).toBeUndefined(); expect(r.data.logo_url).toBeUndefined(); expect(r.data.stream_format).toBeUndefined(); expect(r.data.display_order).toBe(0); expect(r.data.categories).toEqual([]); }
  });
  it('wraps a single checked category into an array', () => {
    const c = id(); const r = stationInputSchema.parse({ ...station(), categories: c }); expect(r.categories).toEqual([c]);
  });
  it.each(['javascript:alert(1)', 'ftp://x.org/a', 'not a url'])('rejects stream_url %s', (u) => { expect(stationInputSchema.safeParse({ ...station(), stream_url: u }).success).toBe(false); });
  it('rejects a bad slug and a bad format', () => {
    expect(stationInputSchema.safeParse({ ...station(), slug: 'Bad Slug!' }).success).toBe(false);
    expect(stationInputSchema.safeParse({ ...station(), stream_format: 'wav' }).success).toBe(false);
  });
});
describe('reference schemas', () => {
  it('country code is uppercased and must be 2 letters', () => {
    expect(countryInputSchema.parse({ code: 'ar', name: 'Argentina', is_active: true }).code).toBe('AR');
    expect(countryInputSchema.safeParse({ code: 'ARG', name: 'Argentina', is_active: true }).success).toBe(false);
  });
  it('category requires a name', () => { expect(categoryInputSchema.safeParse({ name: '', is_active: true }).success).toBe(false); });
});
describe('settings / submission edit / login', () => {
  it('settings: empty contact email allowed, invalid rejected', () => {
    expect(settingsSchema.safeParse({ platform_name: 'Radio Eterna', contact_email: '' }).success).toBe(true);
    expect(settingsSchema.safeParse({ platform_name: 'Radio Eterna', contact_email: 'nope' }).success).toBe(false);
  });
  it('submission edit ignores the authorization checkbox and honeypot fields', () => {
    const r = submissionEditSchema.safeParse({ station_name: 'Radio X', country_id: id(), city: 'Lima', website_url: 'https://x.org', stream_url: 'https://x.org/s', primary_category_id: id(), description: 'Radio cristiana local.', internal_notes: '' });
    expect(r.success).toBe(true);
  });
  it('login lowercases the email', () => { expect(loginSchema.parse({ email: 'A@B.com', password: 'x' }).email).toBe('a@b.com'); });
});

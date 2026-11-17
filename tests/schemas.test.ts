import { describe, expect, it } from 'vitest';
import { stationSearchSchema, submissionSchema } from '@/lib/validation/schemas';
describe('stationSearchSchema', () => {
  it('defaults and sanitizes', () => {
    const r = stationSearchSchema.parse({ pagina: 'abc', orden: 'x', pais: 'Bad Slug!' });
    expect(r.pagina).toBe(1); expect(r.orden).toBe('name'); expect(r.pais).toBeUndefined();
  });
});
describe('submissionSchema', () => {
  const ok = { station_name: 'Radio X', country_id: crypto.randomUUID(), city: 'Lima', contact_name: 'Ana', contact_email: 'A@B.com',
    website_url: 'https://x.org', stream_url: 'https://x.org/live', primary_category_id: crypto.randomUUID(), description: 'Radio cristiana local.', authorized_confirmed: true };
  it('accepts valid input', () => expect(submissionSchema.safeParse(ok).success).toBe(true));
  it('rejects non-http stream', () => expect(submissionSchema.safeParse({ ...ok, stream_url: 'javascript:alert(1)' }).success).toBe(false));
  it('rejects filled honeypot', () => expect(submissionSchema.safeParse({ ...ok, website: 'spam' }).success).toBe(false));
  it('requires authorization', () => expect(submissionSchema.safeParse({ ...ok, authorized_confirmed: false }).success).toBe(false));
});

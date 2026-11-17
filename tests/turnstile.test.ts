import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { verifyTurnstile } from '@/lib/turnstile';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('verifyTurnstile', () => {
  it('allows local development without a secret', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    await expect(verifyTurnstile(undefined, '127.0.0.1')).resolves.toBe(true);
  });

  it('fails closed in production without a secret', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('TURNSTILE_SECRET_KEY', '');
    await expect(verifyTurnstile(undefined, '203.0.113.10')).resolves.toBe(false);
  });

  it('rejects a missing token when a secret is configured', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');
    await expect(verifyTurnstile(undefined, '203.0.113.10')).resolves.toBe(false);
  });

  it('accepts only a successful Cloudflare response', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);
    await expect(verifyTurnstile('valid-token', '203.0.113.10')).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe('POST');
    expect(String(options.body)).toContain('secret=test-secret');
    expect(String(options.body)).toContain('response=valid-token');
  });

  it('rejects failed responses and network errors', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false }) }));
    await expect(verifyTurnstile('invalid-token', '203.0.113.10')).resolves.toBe(false);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failure')));
    await expect(verifyTurnstile('valid-token', '203.0.113.10')).resolves.toBe(false);
  });

  it('rejects non-2xx responses even if their body claims success', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ success: true }) }));
    await expect(verifyTurnstile('valid-token', '203.0.113.10')).resolves.toBe(false);
  });
});

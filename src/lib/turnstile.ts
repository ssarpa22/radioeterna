import 'server-only';

/**
 * Cloudflare Turnstile.
 * Local development may run without credentials; production must fail closed.
 * A missing secret must never silently disable bot protection on a public endpoint.
 */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return process.env.NODE_ENV !== 'production';
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      cache: 'no-store',
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    if (!res.ok) return false;
    return ((await res.json()) as { success?: boolean }).success === true;
  } catch {
    return false;
  }
}

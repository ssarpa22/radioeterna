import 'server-only';
/** Cloudflare Turnstile. If TURNSTILE_SECRET_KEY is unset (local dev) the check is skipped: production MUST set it. */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', cache: 'no-store',
      body: new URLSearchParams({ secret, response: token, remoteip: ip }) });
    return ((await res.json()) as { success?: boolean }).success === true;
  } catch { return false; }
}

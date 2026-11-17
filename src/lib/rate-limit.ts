import 'server-only';
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';

const mem = new Map<string, { n: number; reset: number }>();
/** Per-instance fallback. NOT reliable on serverless (each instance has its own memory): configure Upstash for real limits. */
function memLimit(key: string, limit: number, windowSec: number) {
  const now = Date.now(); const e = mem.get(key);
  if (mem.size > 5000) for (const [k, v] of mem) if (v.reset < now) mem.delete(k);
  if (!e || e.reset < now) { mem.set(key, { n: 1, reset: now + windowSec * 1000 }); return true; }
  e.n++; return e.n <= limit;
}

/** Returns true if the action is allowed. Fixed window. Uses Upstash REST when configured, else memory. */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL; const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      const k = `rl:${createHash('sha256').update(key).digest('hex').slice(0, 32)}`;
      const res = await fetch(`${url}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
        body: JSON.stringify([['INCR', k], ['EXPIRE', k, String(windowSec), 'NX']]) });
      const json = (await res.json()) as { result?: number }[];
      const n = json[0]?.result;
      if (res.ok && typeof n === 'number') return n <= limit;
    } catch { /* fall through to memory limiter */ }
  }
  return memLimit(key, limit, windowSec);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'unknown').trim();
}

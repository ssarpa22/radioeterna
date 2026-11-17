// Server-side only (imported from server actions). Intentionally has no 'server-only' import so it can be unit-tested in Node.
import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { isPublicIp } from './ip';

export type DetectedFormat = 'mp3' | 'aac' | 'ogg' | 'hls';
export type VerifyResult = {
  reachable: boolean;            // got a 2xx response
  audio_detected: boolean;       // the first bytes look like real audio/HLS (not just a header claim)
  detected_format: DetectedFormat | null;
  http_status: number | null; content_type: string | null; final_url: string | null; redirects: number;
  duration_ms: number; checked_at: string; error: string | null; notes: string[];
};
export type VerifyOptions = { timeoutMs?: number; isAllowedIp?: (ip: string) => boolean };

const MAX_REDIRECTS = 5, MAX_BYTES = 32 * 1024, SAMPLE_BYTES = 8 * 1024, READ_WINDOW_MS = 3000, MAX_CONCURRENT = 3, MAX_QUEUE = 20;
class VerifyError extends Error { constructor(public userMessage: string) { super(userMessage); } }

// ---- concurrency limiter (per server instance) ----
let active = 0; const waiters: (() => void)[] = [];
async function acquire() {
  if (waiters.length >= MAX_QUEUE) throw new VerifyError('El verificador está ocupado. Intenta de nuevo en un momento.');
  while (active >= MAX_CONCURRENT) await new Promise<void>((r) => waiters.push(r));
  active++;
}
const release = () => { active--; waiters.shift()?.(); };

// ---- SSRF defense: validate scheme, credentials, then resolve DNS and require EVERY address to be public ----
async function resolveSafe(url: URL, allowed: (ip: string) => boolean): Promise<{ address: string; family: number }> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new VerifyError('Solo se permiten enlaces http:// o https://');
  if (url.username || url.password) throw new VerifyError('El enlace no debe incluir usuario ni contraseña.');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal'))
    throw new VerifyError('Dirección no permitida.');
  if (net.isIP(host)) {
    if (!allowed(host)) throw new VerifyError('Dirección no permitida (red privada o reservada).');
    return { address: host, family: net.isIP(host) };
  }
  const addrs = await dns.lookup(host, { all: true, verbatim: true });
  if (addrs.length === 0) throw new VerifyError('No se encontró el servidor.');
  if (!addrs.every((a) => allowed(a.address))) throw new VerifyError('El dominio apunta a una dirección no permitida (red privada o reservada).');
  return addrs[0]!;
}

type Hop = { status: number; headers: http.IncomingHttpHeaders; body: Buffer };
function requestOnce(url: URL, pin: { address: string; family: number }, timeoutMs: number): Promise<Hop> {
  const lib = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn: () => void) => { if (!done) { done = true; clearTimeout(deadline); fn(); } };
    const req = lib.request({
      hostname: url.hostname.replace(/^\[|\]$/g, ''), port: url.port || undefined, path: `${url.pathname}${url.search}`, method: 'GET',
      headers: { 'User-Agent': 'RadioEternaVerifier/1.0', Accept: '*/*', 'Icy-MetaData': '0' },
      // DNS pinning: connect ONLY to the address we already validated (defeats DNS rebinding between check and connect).
      lookup: ((_h: string, o: { all?: boolean }, cb: (...a: unknown[]) => void) =>
        o?.all ? cb(null, [{ address: pin.address, family: pin.family }]) : cb(null, pin.address, pin.family)) as never,
    }, (res) => {
      const chunks: Buffer[] = []; let size = 0;
      const end = () => finish(() => { res.destroy(); resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }); });
      if ((res.statusCode ?? 0) >= 300 && (res.statusCode ?? 0) < 400) return end();
      const t = setTimeout(end, READ_WINDOW_MS);            // live streams never end: sample a few KB, then hang up
      res.on('data', (c: Buffer) => { chunks.push(c); size += c.length; if (size >= SAMPLE_BYTES || size >= MAX_BYTES) { clearTimeout(t); end(); } });
      res.on('end', () => { clearTimeout(t); end(); });
      res.on('error', (e) => finish(() => reject(e)));
    });
    const deadline = setTimeout(() => req.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })), timeoutMs);
    req.on('error', (e) => finish(() => reject(e)));
    req.end();
  });
}

/** Decide the format from the actual bytes. A Content-Type header alone is NOT proof of audio. */
export function detectAudio(buf: Buffer, contentType: string | null): { format: DetectedFormat | null; note?: string } {
  const head = buf.subarray(0, 64).toString('latin1');
  if (head.startsWith('#EXTM3U')) {
    return buf.toString('latin1', 0, Math.min(buf.length, 4096)).includes('#EXT-X-')
      ? { format: 'hls' } : { format: null, note: 'Es una lista de reproducción (.m3u), no un flujo de audio directo.' };
  }
  if (head.toLowerCase().startsWith('[playlist]')) return { format: null, note: 'Es una lista de reproducción (.pls), no un flujo de audio directo.' };
  if (head.startsWith('OggS')) return { format: 'ogg' };
  if (head.startsWith('ID3')) return { format: 'mp3' };
  if (buf.length >= 2 && buf[0] === 0xff && (buf[1]! & 0xe0) === 0xe0) return { format: ((buf[1]! >> 1) & 3) === 0 ? 'aac' : 'mp3' };
  const ct = (contentType ?? '').split(';')[0]!.trim().toLowerCase();
  if (/^<(!doctype|html)/i.test(head.trimStart())) return { format: null, note: 'La respuesta es una página web, no audio.' };
  if (ct.startsWith('audio/') || ct === 'application/ogg') return { format: null, note: 'La cabecera indica audio, pero el contenido no pudo confirmarse.' };
  return { format: null };
}

const explain = (e: unknown): string => {
  if (e instanceof VerifyError) return e.userMessage;
  const c = (e as NodeJS.ErrnoException)?.code ?? '';
  if (c === 'ENOTFOUND' || c === 'EAI_AGAIN') return 'No se encontró el servidor (DNS).';
  if (c === 'ECONNREFUSED') return 'El servidor rechazó la conexión.';
  if (c === 'ETIMEDOUT' || (e as Error)?.message === 'timeout') return 'El servidor no respondió a tiempo.';
  if (c === 'ECONNRESET') return 'La conexión se interrumpió.';
  if (/CERT|TLS|SSL|DEPTH_ZERO|UNABLE_TO_VERIFY|SELF_SIGNED/i.test(c)) return 'El certificado SSL de la radio no es válido.';
  if (c.startsWith('HPE_')) return 'Respuesta no estándar (posible servidor SHOUTcast antiguo). Verifica manualmente.';
  return 'No se pudo conectar con el servidor.';
};

/** Never throws. Reports what was observed; "audio_detected" means the bytes look like audio, not that every browser can play it. */
export async function verifyStream(input: string, opts: VerifyOptions = {}): Promise<VerifyResult> {
  const started = Date.now(); const allowed = opts.isAllowedIp ?? isPublicIp; const total = opts.timeoutMs ?? 10_000;
  const r: VerifyResult = { reachable: false, audio_detected: false, detected_format: null, http_status: null, content_type: null,
    final_url: null, redirects: 0, duration_ms: 0, checked_at: new Date().toISOString(), error: null, notes: [] };
  try {
    await acquire();
  } catch (e) { r.error = explain(e); return r; }
  try {
    let url: URL;
    try { url = new URL(input); } catch { throw new VerifyError('El enlace no es una URL válida.'); }
    for (let hop = 0; ; hop++) {
      const remaining = total - (Date.now() - started);
      if (remaining <= 0) throw Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' });
      const pin = await resolveSafe(url, allowed);          // re-validated on EVERY redirect hop
      const res = await requestOnce(url, pin, remaining);
      r.http_status = res.status; r.final_url = url.toString();
      const loc = res.headers.location;
      if (res.status >= 300 && res.status < 400 && loc) {
        if (hop >= MAX_REDIRECTS) throw new VerifyError('Demasiadas redirecciones.');
        const next = new URL(loc, url);
        if (url.protocol === 'https:' && next.protocol === 'http:') r.notes.push('Una redirección baja de https a http.');
        r.redirects++; url = next; continue;
      }
      r.content_type = (res.headers['content-type'] as string | undefined) ?? null;
      if (res.status >= 200 && res.status < 300) {
        r.reachable = true;
        const d = detectAudio(res.body, r.content_type);
        r.detected_format = d.format; r.audio_detected = d.format !== null; if (d.note) r.notes.push(d.note);
        if (!r.audio_detected && !d.note) r.notes.push('El servidor responde, pero no se detectó audio en la respuesta.');
        if (r.audio_detected && url.protocol === 'http:') r.notes.push('El enlace final usa http: algunos navegadores lo bloquean en sitios https.');
      } else {
        r.error = `El servidor respondió con el código ${res.status}.`;
        if (res.status === 401 || res.status === 403 || res.status === 429) r.notes.push('Puede estar bloqueando verificaciones automáticas: usa la verificación manual.');
      }
      break;
    }
  } catch (e) { r.error = explain(e); } finally { release(); }
  r.duration_ms = Date.now() - started; r.checked_at = new Date().toISOString();
  return r;
}

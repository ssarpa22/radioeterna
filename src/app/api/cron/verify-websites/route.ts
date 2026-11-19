import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { verifyStream } from '@/lib/security/verify-stream';

export const runtime = 'nodejs';
export const maxDuration = 10;

const BATCH_SIZE = 3;
const CHECK_TIMEOUT_MS = 5_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Station = {
  id: string;
  name: string;
  website_url: string | null;
  website_is_secure: boolean | null;
};

function authorized(request: Request): boolean {
  const secret = process.env.WEBSITE_MONITOR_SECRET;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!secret || secret.length < 32 || !supplied) return false;
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    const secret = process.env.WEBSITE_MONITOR_SECRET;
    const authorization = request.headers.get('authorization');
    const supplied = authorization?.replace(/^Bearer\\s+/i, '');
    console.warn('[website-monitor] Authentication rejected:', {
      serverSecretConfigured: Boolean(secret),
      serverSecretLengthValid: Boolean(secret && secret.length >= 32),
      authorizationHeaderPresent: Boolean(authorization),
      bearerTokenPresent: Boolean(supplied),
      tokenMatches: Boolean(secret && secret.length >= 32 && supplied && Buffer.byteLength(secret) === Buffer.byteLength(supplied) && timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))),
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[website-monitor] Missing server-side Supabase configuration.');
    return NextResponse.json({ error: 'Monitor is not configured.' }, { status: 503 });
  }

  const cursor = new URL(request.url).searchParams.get('cursor');
  if (cursor && !UUID_RE.test(cursor)) {
    return NextResponse.json({ error: 'Invalid cursor.' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const query = supabase.from('stations')
    .select('id,name,website_url,website_is_secure')
    .eq('status', 'published')
    .is('deleted_at', null)
    .not('website_url', 'is', null)
    .order('id', { ascending: true })
    .limit(BATCH_SIZE);

  if (cursor) query.gt('id', cursor);

  const { data, error } = await query;
  if (error) {
    console.error('[website-monitor] Could not load stations:', error.message);
    return NextResponse.json({ error: 'Could not load stations.' }, { status: 500 });
  }

  const stations = (data ?? []) as Station[];
  const issues: Array<{ station: string; outcome: string; detail: string }> = [];
  let verified = 0;

  await Promise.all(stations.map(async (station) => {
    const rawUrl = station.website_url ?? '';
    let parsedUrl: URL | null = null;
    try { parsedUrl = new URL(rawUrl); } catch { /* handled as a definite invalid URL below */ }

    let outcome: string | null = null;
    let detail = '';
    let finalUrl: string | null = null;
    let httpStatus: number | null = null;
    let durationMs = 0;

    if (!parsedUrl || parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) {
      outcome = 'insecure_url';
      detail = 'El sitio oficial debe usar una URL HTTPS válida y no incluir credenciales.';
    } else {
      const result = await verifyStream(parsedUrl.toString(), { timeoutMs: CHECK_TIMEOUT_MS });
      finalUrl = result.final_url;
      httpStatus = result.http_status;
      durationMs = result.duration_ms;

      const certificateInvalid = /certificado SSL/i.test(result.error ?? '');
      const downgradedToHttp = result.final_url?.startsWith('http://') === true || result.notes.some((note) => /redirección baja de https a http/i.test(note));

      if (certificateInvalid) {
        outcome = 'invalid_certificate';
        detail = result.error ?? 'Certificado HTTPS no válido.';
      } else if (downgradedToHttp) {
        outcome = 'insecure_redirect';
        detail = 'El sitio redirige de HTTPS a HTTP.';
      } else if (result.reachable && !result.error && result.final_url?.startsWith('https://')) {
        const { error: updateError } = await supabase.from('stations').update({
          website_is_secure: true,
          website_verified_at: result.checked_at,
        }).eq('id', station.id);
        if (updateError) throw new Error(`No se pudo actualizar ${station.id}: ${updateError.message}`);
        verified++;
        if (!station.website_is_secure) {
          outcome = 'recovered';
          detail = 'El sitio volvió a responder correctamente con HTTPS.';
        }
      } else {
        outcome = 'unreachable';
        detail = result.error || result.notes[0] || 'No se pudo confirmar HTTPS; se conserva el estado anterior por tratarse de un fallo posiblemente temporal.';
      }
    }

    if (outcome && outcome !== 'recovered' && outcome !== 'unreachable') {
      const { error: updateError } = await supabase.from('stations').update({
        website_is_secure: false,
        website_verified_at: null,
      }).eq('id', station.id);
      if (updateError) throw new Error(`No se pudo deshabilitar ${station.id}: ${updateError.message}`);
    }

    if (outcome) {
      const { error: logError } = await supabase.from('website_verification_events').insert({
        station_id: station.id,
        station_name: station.name,
        outcome,
        detail,
        http_status: httpStatus,
        final_url: finalUrl,
        duration_ms: durationMs,
      });
      if (logError) throw new Error(`No se pudo registrar el evento de ${station.id}: ${logError.message}`);
      issues.push({ station: station.name, outcome, detail });
      console.warn('[website-monitor]', station.name, outcome, detail);
    }
  }));

  const last = stations[stations.length - 1];
  const done = stations.length < BATCH_SIZE;
  return NextResponse.json({
    checked: stations.length,
    verified,
    issues,
    done,
    nextCursor: done ? null : last?.id ?? null,
  });
}

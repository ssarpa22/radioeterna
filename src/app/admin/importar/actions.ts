'use server';

import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { slugify } from '@/lib/slug';
import { verifyStream } from '@/lib/security/verify-stream';

type RadioBrowserStation = {
  stationuuid?: string;
  name?: string;
  url?: string;
  url_resolved?: string;
  homepage?: string;
  favicon?: string;
  countrycode?: string;
  language?: string;
  tags?: string;
  votes?: number;
  lastcheckok?: number;
};

export type RadioCandidate = {
  stationUuid: string;
  name: string;
  countryCode: string;
  language: string;
  tags: string;
  streamUrl: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  votes: number;
};

type ActionResult<T> = { ok: boolean; message: string; data?: T };

const MIRRORS = [
  'https://de1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
];
const CHRISTIAN_SIGNAL = /(christian|cristian|evangel|gospel|biblia|bible|worship|adoracion|alabanza|iglesia|jesus|cristo|religious|catolic)/;
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

async function requireSuperAdmin() {
  const staff = await requireStaff('admin');
  if (staff.role !== 'super_admin') throw new Error('Esta herramienta está disponible únicamente para el superadministrador.');
  return staff;
}

async function radioBrowserSearch(countryCode: string, term: string): Promise<RadioBrowserStation[]> {
  const params = new URLSearchParams({
    countrycode: countryCode,
    lastcheckok: '1',
    limit: '100',
    order: 'votes',
    reverse: 'true',
    name: term,
  });
  for (const mirror of MIRRORS) {
    try {
      const response = await fetch(`${mirror}/json/stations/search?${params.toString()}`, {
        headers: { 'User-Agent': 'RadioEternaSuperadmin/1.0' },
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      });
      if (!response.ok) continue;
      const payload: unknown = await response.json();
      if (Array.isArray(payload)) return payload as RadioBrowserStation[];
    } catch {
      // Try the next official Radio Browser mirror.
    }
  }
  throw new Error('Radio Browser no respondió. Probá nuevamente en unos minutos.');
}

async function radioBrowserByUuid(uuid: string): Promise<RadioBrowserStation | null> {
  for (const mirror of MIRRORS) {
    try {
      const response = await fetch(`${mirror}/json/stations/byuuid/${uuid}`, {
        headers: { 'User-Agent': 'RadioEternaSuperadmin/1.0' },
        signal: AbortSignal.timeout(10_000),
        cache: 'no-store',
      });
      if (!response.ok) continue;
      const payload: unknown = await response.json();
      if (Array.isArray(payload)) {
        const found = payload.find((row) => (row as RadioBrowserStation).stationuuid === uuid);
        if (found) return found as RadioBrowserStation;
      }
    } catch {
      // Try another mirror.
    }
  }
  return null;
}

function mapCategorySlug(tagsRaw: string): string {
  const tags = normalize(tagsRaw);
  if (/adoracion|worship|alabanza|praise/.test(tags)) return 'alabanza-y-adoracion';
  if (/gospel/.test(tags)) return 'gospel';
  if (/contemporary|contemporanea|pop|juvenil|urbano/.test(tags)) return 'musica-cristiana-contemporanea';
  if (/evangelica|evangelical/.test(tags)) return 'musica-evangelica';
  if (/biblia|bible|ensenanza|teaching|estudio/.test(tags)) return 'ensenanza-biblica';
  if (/predica|sermon|mensaje/.test(tags)) return 'predicacion-cristiana';
  if (/talk|familia|programacion|noticias/.test(tags)) return 'programacion-cristiana';
  if (/music|musica|cristian/.test(tags)) return 'musica-cristiana';
  return 'radiodifusion-cristiana-general';
}

function mapLanguage(raw: string | undefined): string {
  const value = normalize(raw ?? '');
  if (value.includes('portugu')) return 'pt';
  if (value.includes('english') || value === 'en') return 'en';
  if (value.includes('spanish') || value.includes('espanol') || value === 'es') return 'es';
  const first = (raw ?? '').trim().split(/[;,/ ]/)[0]?.toLowerCase() ?? '';
  return /^[a-z]{2,8}$/.test(first) ? first : 'es';
}

function toCandidate(station: RadioBrowserStation, expectedCountry: string): RadioCandidate | null {
  const name = (station.name ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 120);
  const streamUrl = (station.url_resolved || station.url || '').trim();
  const signal = normalize(`${name} ${station.tags ?? ''}`);
  if (!station.stationuuid || !name || name.length < 2) return null;
  if ((station.countrycode ?? '').toUpperCase() !== expectedCountry || station.lastcheckok !== 1) return null;
  if (!CHRISTIAN_SIGNAL.test(signal) || !streamUrl.startsWith('https://') || streamUrl.length > 2048 || /\s/.test(streamUrl)) return null;
  try {
    const parsed = new URL(streamUrl);
    if (parsed.username || parsed.password) return null;
  } catch {
    return null;
  }
  const website = station.homepage?.trim() ?? '';
  const favicon = station.favicon?.trim() ?? '';
  return {
    stationUuid: station.stationuuid,
    name,
    countryCode: expectedCountry,
    language: mapLanguage(station.language),
    tags: (station.tags ?? '').slice(0, 500),
    streamUrl,
    websiteUrl: /^https:\/\//i.test(website) ? website.slice(0, 2048) : null,
    logoUrl: /^https:\/\//i.test(favicon) ? favicon.slice(0, 2048) : null,
    votes: Number.isFinite(station.votes) ? Number(station.votes) : 0,
  };
}

export async function searchRadioCandidates(countryCode: string, rawTerm: string): Promise<ActionResult<RadioCandidate[]>> {
  try {
    const staff = await requireSuperAdmin();
    if (!(await rateLimit(`radio-import-search:${staff.id}`, 15, 60))) {
      return { ok: false, message: 'Hiciste muchas búsquedas seguidas. Esperá un minuto.' };
    }
    const code = countryCode.trim().toUpperCase();
    const term = rawTerm.trim().slice(0, 80);
    if (!/^[A-Z]{2}$/.test(code) || term.length < 2) {
      return { ok: false, message: 'Elegí un país e ingresá al menos 2 caracteres para buscar.' };
    }
    const supabase = await createClient();
    const { data: country } = await supabase.from('countries').select('code').eq('code', code).eq('is_active', true).maybeSingle();
    if (!country) return { ok: false, message: 'El país seleccionado no está activo en Radio Eterna.' };
    const rows = await radioBrowserSearch(code, term);
    const unique = new Map<string, RadioCandidate>();
    for (const row of rows) {
      const candidate = toCandidate(row, code);
      if (candidate && !unique.has(candidate.stationUuid)) unique.set(candidate.stationUuid, candidate);
    }
    return { ok: true, message: `Se encontraron ${unique.size} emisoras candidatas con señal cristiana y stream HTTPS.`, data: [...unique.values()].slice(0, 40) };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'No se pudo completar la búsqueda.' };
  }
}

export async function importRadioCandidates(uuids: string[]): Promise<ActionResult<{ imported: { id: string; name: string }[]; skipped: { name: string; reason: string }[] }>> {
  try {
    const staff = await requireSuperAdmin();
    if (!(await rateLimit(`radio-import-save:${staff.id}`, 5, 60))) {
      return { ok: false, message: 'Hiciste muchas importaciones seguidas. Esperá un minuto.' };
    }
    const selected = [...new Set(uuids)].slice(0, 15);
    if (!selected.length || selected.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) {
      return { ok: false, message: 'La selección no es válida.' };
    }

    const supabase = await createClient();
    const [{ data: countries }, { data: categories }] = await Promise.all([
      supabase.from('countries').select('id,code,name').eq('is_active', true),
      supabase.from('categories').select('id,slug').eq('is_active', true),
    ]);
    const countryByCode = new Map((countries ?? []).map((country) => [country.code, country]));
    const categoryBySlug = new Map((categories ?? []).map((category) => [category.slug, category]));
    const imported: { id: string; name: string }[] = [];
    const skipped: { name: string; reason: string }[] = [];

    for (const uuid of selected) {
      const source = await radioBrowserByUuid(uuid);
      const candidate = source ? toCandidate(source, (source.countrycode ?? '').toUpperCase()) : null;
      const label = candidate?.name ?? uuid;
      if (!candidate) {
        skipped.push({ name: label, reason: 'Radio Browser ya no devuelve una emisora válida.' });
        continue;
      }
      const country = countryByCode.get(candidate.countryCode);
      if (!country) {
        skipped.push({ name: label, reason: 'El país no está habilitado en Radio Eterna.' });
        continue;
      }

      const { data: duplicateByStream } = await supabase.from('stations').select('id').eq('stream_url', candidate.streamUrl).is('deleted_at', null).limit(1).maybeSingle();
      const { data: duplicateByName } = duplicateByStream ? { data: null } : await supabase.from('stations').select('id').eq('country_id', country.id).ilike('name', candidate.name).is('deleted_at', null).limit(1).maybeSingle();
      if (duplicateByStream || duplicateByName) {
        skipped.push({ name: label, reason: 'Ya existe una radio con ese stream o nombre en ese país.' });
        continue;
      }

      const verification = await verifyStream(candidate.streamUrl, { timeoutMs: 8_000 });
      const finalUrl = verification.final_url;
      if (!verification.reachable || !verification.audio_detected || !finalUrl?.startsWith('https://')) {
        skipped.push({ name: label, reason: verification.error || verification.notes[0] || 'No se pudo confirmar audio HTTPS.' });
        continue;
      }

      const categorySlug = mapCategorySlug(candidate.tags);
      const category = categoryBySlug.get(categorySlug) ?? categoryBySlug.get('radiodifusion-cristiana-general');
      if (!category) {
        skipped.push({ name: label, reason: 'No hay una categoría activa disponible.' });
        continue;
      }

      const baseSlug = `${slugify(candidate.name) || 'radio'}-${candidate.countryCode.toLowerCase()}`.slice(0, 75).replace(/-+$/, '');
      let slug = baseSlug;
      for (let suffix = 2; ; suffix++) {
        const { data: existing } = await supabase.from('stations').select('id').eq('slug', slug).limit(1).maybeSingle();
        if (!existing) break;
        slug = `${baseSlug}-${suffix}`;
      }

      const { data: created, error } = await supabase.from('stations').insert({
        content_type: 'radio',
        name: candidate.name,
        slug,
        country_id: country.id,
        primary_category_id: category.id,
        language: candidate.language,
        stream_url: finalUrl,
        stream_format: verification.detected_format ?? 'unknown',
        logo_url: candidate.logoUrl,
        website_url: candidate.websiteUrl,
        description: null,
        status: 'draft',
        verification_status: 'verified',
        is_featured: false,
        is_demo: false,
        last_verified_at: verification.checked_at,
        last_verification_result: verification,
        display_order: 0,
      }).select('id').single();

      if (error || !created) {
        skipped.push({ name: label, reason: 'No se pudo guardar en la base de datos. No se publicó.' });
        continue;
      }
      imported.push({ id: created.id, name: candidate.name });
    }

    return {
      ok: imported.length > 0,
      message: `Importadas ${imported.length}; omitidas ${skipped.length}. Todas las importadas quedan como borrador.`,
      data: { imported, skipped },
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'No se pudo importar la selección.' };
  }
}

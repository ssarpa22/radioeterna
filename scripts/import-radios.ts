#!/usr/bin/env node
/**
 * Importador seguro de radios cristianas desde Radio Browser.
 *
 * Solo genera archivos de revisión/SQL. Nunca escribe en Supabase directamente
 * ni publica emisoras. El SQL crea registros en estado draft.
 *
 * Uso:
 *   npx --yes tsx scripts/import-radios.ts --dry-run
 *   npx --yes tsx scripts/import-radios.ts --sql
 *   npx --yes tsx scripts/import-radios.ts --json
 *   npx --yes tsx scripts/import-radios.ts --sql --max-checks=400
 */
import fs from 'node:fs';
import path from 'node:path';
import { verifyStream } from '../src/lib/security/verify-stream';
import { slugify } from '../src/lib/slug';

const LATAM_COUNTRIES = [
  'AR', 'BO', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'GT', 'HN',
  'MX', 'NI', 'PA', 'PE', 'PR', 'PY', 'SV', 'UY', 'VE',
] as const;

const TAGS = [
  'christian', 'gospel', 'cristiana', 'evangelica',
  'cristiano', 'evangelico', 'adoracion', 'biblia', 'worship',
] as const;

// Radio Browser no siempre etiqueta bien las emisoras argentinas.
// Estas búsquedas por nombre complementan las búsquedas por tags sin ampliar
// indiscriminadamente el catálogo de los demás países.
const ARGENTINA_NAME_QUERIES = [
  'radio cristiana',
  'radio evangelica',
  'radio cristiano',
  'radio evangélica',
  'musica cristiana',
  'adoracion',
  'gospel',
] as const;
const MIRRORS = [
  'https://de1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
];
const API_LIMIT = 100;
const DEFAULT_MAX_CHECKS = 400;
const BATCH_SIZE = 5;
const VERIFY_TIMEOUT_MS = 8_000;

type RadioBrowserStation = {
  stationuuid?: string;
  name?: string;
  url?: string;
  url_resolved?: string;
  homepage?: string;
  favicon?: string;
  tags?: string;
  countrycode?: string;
  state?: string;
  language?: string;
  votes?: number;
  lastcheckok?: number;
};

type Candidate = {
  stationUuid: string;
  name: string;
  slug: string;
  countryCode: string;
  region: string | null;
  categorySlug: string;
  language: string;
  streamUrl: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  tags: string;
  votes: number;
};

type VerifiedStation = Candidate & {
  finalUrl: string;
  format: string;
  checkedAt: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function argValue(prefix: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function cleanName(raw: string): string {
  return raw.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 120);
}

function normalized(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function mapCategorySlug(tagsRaw: string): string {
  const tags = normalized(tagsRaw);
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
  const value = normalized(raw ?? '');
  if (value.includes('portugu')) return 'pt';
  if (value.includes('english') || value === 'en') return 'en';
  if (value.includes('spanish') || value.includes('espanol') || value === 'es') return 'es';
  const first = (raw ?? '').trim().split(/[;,/ ]/)[0]?.toLowerCase() ?? '';
  return /^[a-z]{2,8}$/.test(first) ? first : 'es';
}

async function fetchOneQuery(countryCode: string, tag?: string, name?: string): Promise<RadioBrowserStation[]> {
  const params = new URLSearchParams({
    countrycode: countryCode,
    lastcheckok: '1',
    limit: String(API_LIMIT),
    order: 'votes',
    reverse: 'true',
  });
  if (tag) params.set('tag', tag);
  if (name) params.set('name', name);

  for (const mirror of MIRRORS) {
    try {
      const response = await fetch(`${mirror}/json/stations/search?${params}`, {
        headers: { 'User-Agent': 'RadioEternaImporter/2.0' },
        signal: AbortSignal.timeout(12_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error('La API devolvió una respuesta inesperada.');
      return data as RadioBrowserStation[];
    } catch (error) {
      console.warn(`[API] ${countryCode}/${tag} en ${mirror}: ${(error as Error).message}`);
    }
  }

  return [];
}

async function fetchRadioBrowserStations(): Promise<RadioBrowserStation[]> {
  const byUuid = new Map<string, RadioBrowserStation>();
  let completedQueries = 0;

  // Consultas por país para que los países con menos votos no queden fuera
  // de un ranking global. Se amplían sin cambiar de proveedor ni usar scraping.
  const totalQueries = LATAM_COUNTRIES.length * TAGS.length + ARGENTINA_NAME_QUERIES.length;
  const collect = (rows: RadioBrowserStation[]) => {
    for (const station of rows) {
      if (station.stationuuid && !byUuid.has(station.stationuuid)) {
        byUuid.set(station.stationuuid, station);
      }
    }
  };

  for (const countryCode of LATAM_COUNTRIES) {
    for (const tag of TAGS) {
      collect(await fetchOneQuery(countryCode, tag));
      completedQueries++;
      await sleep(350);
    }

    // Búsquedas adicionales dirigidas a Argentina: muchas emisoras locales
    // aparecen en Radio Browser con tags incompletos o inconsistentes.
    if (countryCode === 'AR') {
      for (const name of ARGENTINA_NAME_QUERIES) {
        collect(await fetchOneQuery(countryCode, undefined, name));
        completedQueries++;
        await sleep(350);
      }
    }

    console.log(`[API] ${countryCode}: consultas completadas (${completedQueries}/${totalQueries})`);
  }

  return [...byUuid.values()];
}

function buildCandidates(rows: RadioBrowserStation[]): Candidate[] {
  const candidates: Candidate[] = [];
  const seenStreams = new Set<string>();
  const seenNames = new Set<string>();

  for (const station of rows) {
    const countryCode = (station.countrycode ?? '').toUpperCase().trim();
    if (!LATAM_COUNTRIES.includes(countryCode as (typeof LATAM_COUNTRIES)[number])) continue;
    if (station.lastcheckok !== 1) continue;

    // Las búsquedas por nombre de Argentina pueden devolver resultados que no
    // sean cristianos. Exigimos una señal temática en el nombre o en los tags.
    const christianSignal = normalized(`${station.name ?? ''} ${station.tags ?? ''}`);
    if (!/(christian|cristian|evangel|gospel|biblia|bible|worship|adoracion|alabanza|iglesia|jesus|cristo|religious|catolic)/.test(christianSignal)) continue;

    const streamUrl = (station.url_resolved || station.url || '').trim();
    // Los streams HTTP se excluyen: el navegador puede bloquear audio mixto
    // cuando Radio Eterna se sirve por HTTPS.
    if (!streamUrl.startsWith('https://') || streamUrl.length > 2048 || /\s/.test(streamUrl)) continue;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(streamUrl);
      if (parsedUrl.username || parsedUrl.password) continue;
    } catch {
      continue;
    }

    const name = cleanName(station.name ?? '');
    if (name.length < 2) continue;

    const streamKey = streamUrl.toLowerCase().replace(/\/$/, '');
    const nameKey = `${countryCode}:${normalized(name)}`;
    if (seenStreams.has(streamKey) || seenNames.has(nameKey)) continue;

    const baseSlug = slugify(name);
    if (!baseSlug) continue;

    seenStreams.add(streamKey);
    seenNames.add(nameKey);

    const website = station.homepage?.trim();
    const favicon = station.favicon?.trim();
    candidates.push({
      stationUuid: station.stationuuid ?? '',
      name,
      slug: `${baseSlug}-${countryCode.toLowerCase()}`,
      countryCode,
      // Radio Browser "state" es una región/provincia, no necesariamente ciudad.
      // No lo copiamos al campo city para no publicar información incorrecta.
      region: station.state?.trim().slice(0, 100) || null,
      categorySlug: mapCategorySlug(station.tags ?? ''),
      language: mapLanguage(station.language),
      streamUrl,
      websiteUrl: website && /^https?:\/\//i.test(website) ? website.slice(0, 2048) : null,
      logoUrl: favicon && /^https:\/\//i.test(favicon) ? favicon.slice(0, 2048) : null,
      tags: station.tags ?? '',
      votes: Number.isFinite(station.votes) ? Number(station.votes) : 0,
    });
  }

  return candidates;
}

async function verifyCandidates(candidates: Candidate[], maxChecks: number): Promise<VerifiedStation[]> {
  const selected = candidates.slice(0, maxChecks);
  if (candidates.length > selected.length) {
    console.warn(`Se limitaron las verificaciones a ${maxChecks} de ${candidates.length} candidatas. Usa --max-checks=N para ampliar.`);
  }

  const verified: VerifiedStation[] = [];
  for (let i = 0; i < selected.length; i += BATCH_SIZE) {
    const batch = selected.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(async (candidate) => ({
      candidate,
      result: await verifyStream(candidate.streamUrl, { timeoutMs: VERIFY_TIMEOUT_MS }),
    })));

    for (const { candidate, result } of results) {
      const finalUrl = result.final_url || candidate.streamUrl;
      if (result.reachable && result.audio_detected && finalUrl.startsWith('https://')) {
        console.log(`[OK]   (${candidate.countryCode}) ${candidate.name} — ${result.detected_format}`);
        verified.push({
          ...candidate,
          finalUrl,
          format: result.detected_format ?? 'unknown',
          checkedAt: result.checked_at,
        });
      } else {
        console.log(`[SKIP] (${candidate.countryCode}) ${candidate.name} — ${result.error || result.notes[0] || 'no se confirmó audio HTTPS'}`);
      }
    }
  }

  return verified;
}

function sqlString(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${value.replace(/'/g, "''")}'`;
}

function buildSql(stations: VerifiedStation[]): string {
  const lines = [
    '-- Radio Eterna: radios candidatas verificadas técnicamente desde Radio Browser.',
    `-- Generado: ${new Date().toISOString()}`,
    `-- Registros: ${stations.length}`,
    '-- IMPORTANTE: se crean como draft; ninguna radio queda publicada automáticamente.',
    '-- Revisar nombre, país, categoría, derechos del logo y contenido antes de aprobar.',
    '',
    'begin;',
    '',
  ];

  for (const station of stations) {
    const description = `Emisora cristiana en vivo desde ${station.countryCode}.`.slice(0, 200);
    const slugBase = station.slug;
    lines.push(
      `-- Radio Browser UUID: ${station.stationUuid}; votos: ${station.votes}; región informada: ${station.region ?? 'sin dato'}`,
      'insert into public.stations (',
      '  content_type, name, slug, short_description, country_id, primary_category_id,',
      '  language, stream_url, stream_format, logo_url, website_url,',
      '  status, verification_status, is_featured, is_demo, last_verified_at',
      ')',
      'select',
      `  'radio', ${sqlString(station.name)}, public.unique_station_slug(${sqlString(slugBase)}),`,
      `  ${sqlString(description)}, c.id, cat.id,`,
      `  ${sqlString(station.language)}, ${sqlString(station.finalUrl)}, ${sqlString(station.format)},`,
      `  ${sqlString(station.logoUrl)}, ${sqlString(station.websiteUrl)},`,
      "  'draft', 'verified', false, false, now()",
      'from public.countries c',
      'cross join public.categories cat',
      `where c.code = ${sqlString(station.countryCode)} and cat.slug = ${sqlString(station.categorySlug)}`,
      '  and not exists (',
      '    select 1 from public.stations existing',
      '    where existing.deleted_at is null',
      `      and (lower(existing.stream_url) = lower(${sqlString(station.finalUrl)})`,
      `        or (existing.country_id = c.id and lower(trim(existing.name)) = lower(${sqlString(station.name)})))`,
      '  );',
      '',
    );
  }

  lines.push('commit;', '');
  return lines.join('\n');
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const mode = args.has('--sql') ? 'sql' : args.has('--json') ? 'json' : 'dry-run';
  const maxChecksRaw = Number(argValue('--max-checks=') ?? DEFAULT_MAX_CHECKS);
  const maxChecks = Number.isInteger(maxChecksRaw) && maxChecksRaw > 0 ? maxChecksRaw : DEFAULT_MAX_CHECKS;

  console.log(`=== Radio Eterna · Importador seguro LATAM (modo: ${mode}) ===\n`);
  console.log('Fuente: Radio Browser · Se crearán borradores, nunca publicaciones automáticas.\n');

  const rawStations = await fetchRadioBrowserStations();
  console.log(`\nTotal recibido desde Radio Browser: ${rawStations.length} emisoras únicas.`);

  const candidates = buildCandidates(rawStations);
  console.log(`Candidatas LATAM con HTTPS único: ${candidates.length}.`);
  console.log(`Verificando audio real (máximo ${maxChecks}; timeout ${VERIFY_TIMEOUT_MS} ms por emisora)...\n`);

  const verified = await verifyCandidates(candidates, maxChecks);
  console.log(`\nVerificadas técnicamente: ${verified.length} emisoras.`);

  if (mode === 'sql') {
    const outDir = path.resolve(process.cwd(), 'radio-import-output');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'seed_radio_browser_drafts.sql');
    fs.writeFileSync(outPath, buildSql(verified), 'utf8');
    console.log(`SQL generado: ${outPath}`);
    console.log('El SQL crea borradores con verificación técnica; no publica emisoras.');
    return;
  }

  if (mode === 'json') {
    const outDir = path.resolve(process.cwd(), 'radio-import-output');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'radio_browser_review.json');
    const countBy = (key: 'countryCode' | 'language' | 'format') =>
      verified.reduce<Record<string, number>>((counts, station) => {
        const value = station[key] || 'unknown';
        counts[value] = (counts[value] ?? 0) + 1;
        return counts;
      }, {});

    fs.writeFileSync(outPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      source: 'Radio Browser',
      totalReceived: rawStations.length,
      candidates: candidates.length,
      checked: Math.min(candidates.length, maxChecks),
      verified: verified.length,
      summary: {
        byCountry: countBy('countryCode'),
        byLanguage: countBy('language'),
        byFormat: countBy('format'),
        missingLogo: verified.filter((station) => !station.logoUrl).length,
        missingWebsite: verified.filter((station) => !station.websiteUrl).length,
      },
      stations: verified,
    }, null, 2), 'utf8');
    console.log(`Informe generado: ${outPath}`);
    return;
  }

  console.log('\nResumen de las primeras radios verificadas:');
  for (const station of verified.slice(0, 30)) {
    console.log(`- [${station.countryCode}] ${station.name} — ${station.categorySlug} — ${station.format}`);
  }
  if (verified.length > 30) console.log(`... y ${verified.length - 30} más.`);
  console.log('\nNo se modificó Supabase ni se generó SQL en modo dry-run.');
}

main().catch((error) => {
  console.error('Error fatal:', error);
  process.exitCode = 1;
});

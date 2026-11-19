import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { isWebsiteVerificationCurrent } from '@/lib/security/website-verification';
import { fmtDate } from '@/lib/labels';
import { PageHeader } from '@/components/ui';
import { DiagnosticActions } from '@/components/admin/DiagnosticActions';

export const metadata: Metadata = { title: 'Centro de resolución' };

type StreamResult = {
  error?: string | null;
  error_code?: string | null;
  notes?: string[];
  http_status?: number | null;
  checked_at?: string;
  detected_format?: string | null;
};

export default async function ResolutionCenter() {
  await requireStaff();
  const supabase = createAdminClient();
  const [stationsResult, eventsResult] = await Promise.all([
    supabase.from('stations')
      .select('id, name, stream_url, website_url, status, verification_status, last_verified_at, last_verification_result, website_is_secure, website_verified_at')
      .eq('status', 'published')
      .is('deleted_at', null)
      .order('name', { ascending: true }),
    supabase.from('website_verification_events')
      .select('station_id, outcome, detail, error_code, checked_at')
      .order('checked_at', { ascending: false })
      .limit(200),
  ]);

  const stations = stationsResult.data ?? [];
  const now = Date.now();
  const streamIssues = stations.filter((station) => station.verification_status === 'failed');
  const websiteIssues = stations.filter((station) =>
    Boolean(station.website_url) &&
    !isWebsiteVerificationCurrent(station.website_is_secure, station.website_verified_at, now)
  );
  const latestWebsiteEvent = new Map<string, (typeof eventsResult.data extends (infer T)[] | null ? T : never)>();
  for (const event of eventsResult.data ?? []) {
    if (event.station_id && !latestWebsiteEvent.has(event.station_id)) latestWebsiteEvent.set(event.station_id, event);
  }
  const affectedIds = new Set([...streamIssues, ...websiteIssues].map((station) => station.id));
  const totalPublished = stations.length;
  const healthy = totalPublished - affectedIds.size;

  return (
    <>
      <PageHeader title="Centro de resolución" intro="Una bandeja de trabajo para encontrar emisoras publicadas con problemas y volver a comprobar sus señales o sitios oficiales." />
      <div className="wrap grid gap-8 py-8">
        {(stationsResult.error || eventsResult.error) && (
          <p role="alert" className="rounded-xl bg-[#F8E5E3] px-4 py-3 text-danger">
            No se pudo cargar toda la información. Revisá la conexión y los permisos de la base de datos.
          </p>
        )}

        <section aria-label="Resumen de salud" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-line bg-white p-4"><p className="text-sm text-ink/70">Radios publicadas</p><p className="mt-1 font-display text-4xl">{totalPublished}</p></div>
          <div className="rounded-2xl border border-ok/30 bg-[#E6F2EC] p-4"><p className="text-sm text-ink/70">Sin incidencias detectadas</p><p className="mt-1 font-display text-4xl text-ok">{healthy}</p></div>
          <div className="rounded-2xl border border-danger/30 bg-[#F8E5E3] p-4"><p className="text-sm text-ink/70">Streams con fallo</p><p className="mt-1 font-display text-4xl text-danger">{streamIssues.length}</p></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm text-ink/70">Sitios para revisar</p><p className="mt-1 font-display text-4xl text-amber-800">{websiteIssues.length}</p></div>
        </section>

        <div className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink/70">
          Este panel no ejecuta verificaciones automáticamente. Cada botón vuelve a comprobar únicamente el elemento elegido. La verificación HTTPS y la del stream son independientes.
          <Link href="/admin/monitoreo" className="ml-1 font-semibold text-sky hover:underline">Ver historial de monitoreo →</Link>
        </div>

        <section aria-labelledby="streams-fallidos">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><h2 id="streams-fallidos" className="text-xl">Streams que necesitan atención</h2><p className="mt-1 text-sm text-ink/60">Emisoras publicadas cuya última verificación de audio terminó en fallo.</p></div>
            <span className="text-sm font-semibold text-danger">{streamIssues.length} incidencia(s)</span>
          </div>
          {streamIssues.length === 0 ? (
            <div role="status" className="rounded-2xl border border-ok/30 bg-[#E6F2EC] p-5 text-sm text-ok">No hay streams publicados marcados como fallidos.</div>
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
              {streamIssues.map((station) => {
                const result = (station.last_verification_result ?? {}) as StreamResult;
                return (
                  <li key={station.id} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <Link href={`/admin/radios/${station.id}`} className="font-semibold hover:text-sky hover:underline">{station.name}</Link>
                      <p className="mt-1 text-sm text-danger">{result.error || result.notes?.[0] || 'No se pudo confirmar audio en la última verificación.'}</p>
                      <p className="mt-1 text-xs text-ink/60">
                        {result.error_code ? <><code className="mr-2 rounded bg-ink/5 px-1.5 py-0.5">{result.error_code}</code></> : null}
                        {result.http_status ? `HTTP ${result.http_status} · ` : ''}Última prueba: {fmtDate(station.last_verified_at)}
                      </p>
                    </div>
                    <DiagnosticActions stationId={station.id} website={false} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="web-fallidos">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><h2 id="web-fallidos" className="text-xl">Sitios oficiales para revisar</h2><p className="mt-1 text-sm text-ink/60">Sitios sin una comprobación HTTPS vigente. Esto no implica que el stream de audio esté fallando.</p></div>
            <span className="text-sm font-semibold text-amber-800">{websiteIssues.length} pendiente(s)</span>
          </div>
          {websiteIssues.length === 0 ? (
            <div role="status" className="rounded-2xl border border-ok/30 bg-[#E6F2EC] p-5 text-sm text-ok">Todos los sitios oficiales publicados tienen una verificación HTTPS vigente.</div>
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
              {websiteIssues.map((station) => {
                const event = latestWebsiteEvent.get(station.id);
                const reason = !station.website_verified_at
                  ? 'Pendiente de primera verificación'
                  : station.website_is_secure
                    ? 'La verificación anterior venció'
                    : event?.detail || 'HTTPS no validado';
                return (
                  <li key={station.id} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <Link href={`/admin/radios/${station.id}`} className="font-semibold hover:text-sky hover:underline">{station.name}</Link>
                      <p className="mt-1 text-sm text-amber-800">{reason}</p>
                      {event?.error_code && <p className="mt-1 text-xs text-ink/60">Diagnóstico: <code className="rounded bg-ink/5 px-1.5 py-0.5">{event.error_code}</code> · {fmtDate(event.checked_at)}</p>}
                      {station.website_url && <a href={station.website_url} target="_blank" rel="noreferrer" className="mt-1 inline-block break-all text-xs text-sky hover:underline">Abrir sitio oficial ↗</a>}
                    </div>
                    <DiagnosticActions stationId={station.id} website />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

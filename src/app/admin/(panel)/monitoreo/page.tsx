import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { isWebsiteVerificationCurrent } from '@/lib/security/website-verification';
import { fmtDate } from '@/lib/labels';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Monitoreo de sitios web' };

const ERROR_OUTCOMES = ['invalid_certificate', 'insecure_redirect', 'insecure_url', 'unreachable'] as const;
const OUTCOME_LABEL: Record<string, string> = {
  invalid_certificate: 'Certificado inválido',
  insecure_redirect: 'Redirección insegura',
  insecure_url: 'URL insegura',
  unreachable: 'Sitio no disponible',
  recovered: 'HTTPS recuperado',
};
type Filter = 'todos' | 'errores' | 'recuperaciones';

export default async function WebsiteMonitoring({ searchParams }: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;
  const filter: Filter = params.tipo === 'errores' || params.tipo === 'recuperaciones' ? params.tipo : 'todos';
  const supabase = createAdminClient();

  const [stationsResult, eventsResult] = await Promise.all([
    supabase.from('stations')
      .select('id, name, website_url, website_is_secure, website_verified_at')
      .eq('status', 'published')
      .is('deleted_at', null)
      .not('website_url', 'is', null),
    (() => {
      let query = supabase.from('website_verification_events')
        .select('id, station_id, station_name, outcome, detail, error_code, http_status, final_url, duration_ms, checked_at')
        .order('checked_at', { ascending: false })
        .limit(60);
      if (filter === 'errores') query = query.in('outcome', [...ERROR_OUTCOMES]);
      if (filter === 'recuperaciones') query = query.eq('outcome', 'recovered');
      return query;
    })(),
  ]);

  const stations = stationsResult.data ?? [];
  const now = Date.now();
  const verified = stations.filter((station) =>
    isWebsiteVerificationCurrent(station.website_is_secure, station.website_verified_at, now)
  ).length;
  const attention = stations.filter((station) => !station.website_is_secure).length;
  const expired = stations.filter((station) =>
    Boolean(station.website_is_secure && station.website_verified_at) &&
    !isWebsiteVerificationCurrent(station.website_is_secure, station.website_verified_at, now)
  ).length;
  const pending = stations.filter((station) => !station.website_verified_at).length;

  const filters: { value: Filter; label: string }[] = [
    { value: 'todos', label: 'Todos los eventos' },
    { value: 'errores', label: 'Incidentes' },
    { value: 'recuperaciones', label: 'Recuperaciones' },
  ];

  return (
    <>
      <PageHeader title="Monitoreo de sitios web" intro="Estado HTTPS de los sitios oficiales y últimos diagnósticos automáticos." />
      <div className="wrap grid gap-8 py-8">
        {(stationsResult.error || eventsResult.error) && (
          <p role="alert" className="rounded-xl bg-[#F8E5E3] px-4 py-3 text-danger">
            No se pudo cargar toda la información del monitoreo. Revisá los permisos y la conexión con la base de datos.
          </p>
        )}
        <section aria-labelledby="resumen-monitoreo">
          <h2 id="resumen-monitoreo" className="mb-3 text-xl">Estado de los sitios publicados</h2>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-line bg-white p-4"><dt className="text-sm text-ink/70">Sitios oficiales</dt><dd className="mt-1 font-display text-4xl">{stations.length}</dd></div>
            <div className="rounded-2xl border border-ok/30 bg-[#E6F2EC] p-4"><dt className="text-sm text-ink/70">HTTPS vigente</dt><dd className="mt-1 font-display text-4xl text-ok">{verified}</dd></div>
            <div className="rounded-2xl border border-danger/30 bg-[#F8E5E3] p-4"><dt className="text-sm text-ink/70">Requieren atención</dt><dd className="mt-1 font-display text-4xl text-danger">{attention}</dd></div>
            <div className="rounded-2xl border border-line bg-white p-4"><dt className="text-sm text-ink/70">Verificación vencida</dt><dd className="mt-1 font-display text-4xl">{expired}</dd></div>
          </dl>
          <p className="mt-3 text-sm text-ink/60">{pending} sitio(s) todavía no tienen una verificación HTTPS exitosa registrada. Las verificaciones vigentes caducan a los 30 días.</p>
        </section>

        <section aria-labelledby="historial-monitoreo">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><h2 id="historial-monitoreo" className="text-xl">Historial de diagnósticos</h2><p className="mt-1 text-sm text-ink/60">Hasta 60 eventos recientes registrados por el verificador automático.</p></div>
            <nav aria-label="Filtrar eventos" className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <Link key={item.value} href={item.value === 'todos' ? '/admin/monitoreo' : `/admin/monitoreo?tipo=${item.value}`}
                  aria-current={filter === item.value ? 'page' : undefined}
                  className={`rounded-full border px-3 py-2 text-sm ${filter === item.value ? 'border-navy bg-navy text-white' : 'border-line bg-white hover:border-navy'}`}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          {eventsResult.error ? <p className="text-sm text-danger">No se pudo cargar el historial de eventos.</p> :
            (eventsResult.data ?? []).length === 0 ? (
              <div className="rounded-2xl border border-line bg-white p-6 text-sm text-ink/70">
                No hay eventos para este filtro. Los chequeos correctos habituales no generan entradas; se registran incidentes y recuperaciones.
              </div>
            ) : (
              <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
                {(eventsResult.data ?? []).map((event) => {
                  const recovered = event.outcome === 'recovered';
                  return (
                    <li key={event.id} className="px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold">{event.station_name}</p>
                          <p className={`mt-1 text-sm font-medium ${recovered ? 'text-ok' : 'text-danger'}`}>{OUTCOME_LABEL[event.outcome] ?? event.outcome}</p>
                        </div>
                        <time dateTime={event.checked_at} className="text-sm text-ink/60">{fmtDate(event.checked_at)}</time>
                      </div>
                      <p className="mt-2 text-sm text-ink/80">{event.detail}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/60">
                        {event.http_status && <span>HTTP {event.http_status}</span>}
                        <span>{event.duration_ms} ms</span>
                        {event.error_code && <code className="rounded bg-ink/5 px-1.5 py-0.5 text-ink">{event.error_code}</code>}
                        {event.final_url && <a href={event.final_url} target="_blank" rel="noreferrer" className="break-all text-sky hover:underline">URL comprobada</a>}
                        {event.station_id && <Link href={`/admin/radios/${event.station_id}`} className="font-semibold text-sky hover:underline">Ver ficha de la radio →</Link>}
                      </div>
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

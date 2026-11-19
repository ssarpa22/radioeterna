import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { STATUS_LABEL, VERIFICATION_LABEL, fmtDate } from '@/lib/labels';
import { isWebsiteVerificationCurrent } from '@/lib/security/website-verification';
import { PageHeader } from '@/components/ui';
import { StationForm } from '@/components/admin/StationForm';
import { StationCommands } from '@/components/admin/StationCommands';
import { VerifyResultView } from '@/components/admin/VerifyResultView';
import type { VerifyResult } from '@/lib/security/verify-stream';

export const metadata: Metadata = { title: 'Editar radio' };
export default async function EditStation({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(); const { id } = await params; const supabase = await createClient();
  const adminSupabase = createAdminClient();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: s } = await supabase.from('stations').select('*').eq('id', id).maybeSingle();
  if (!s) notFound();
  const [c, k, extra, logs, websiteEvents] = await Promise.all([
    supabase.from('countries').select('id,code,name,slug').order('name'), supabase.from('categories').select('id,name,slug,description').order('display_order'),
    supabase.from('station_categories').select('category_id').eq('station_id', id),
    supabase.from('station_status_logs').select('id, from_status, to_status, created_at').eq('station_id', id).order('created_at', { ascending: false }).limit(8),
    adminSupabase.from('website_verification_events').select('outcome, detail, error_code, http_status, final_url, duration_ms, checked_at').eq('station_id', id).order('checked_at', { ascending: false }).limit(1).maybeSingle()]);
  const last = s.last_verification_result as (VerifyResult & { manual?: boolean; verified_by?: string }) | null;
  const websiteCurrent = isWebsiteVerificationCurrent(s.website_is_secure, s.website_verified_at);
  const websiteEvent = websiteEvents.data;
  return (
    <>
      <PageHeader title={s.name} crumb={{ href: '/admin/radios', label: 'Radios' }} intro={<>
        <span className="badge mr-2">{STATUS_LABEL[s.status]}</span><span className="badge mr-2">Stream: {VERIFICATION_LABEL[s.verification_status]}</span>
        {s.status === 'published' && <Link href={`/radios/${s.slug}`} className="text-sky hover:underline">Ver en el sitio</Link>}{s.deleted_at && <span className="badge">Eliminada</span>}</>} />
      <div className="wrap grid gap-10 py-8 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-8">
          <section aria-labelledby="acciones"><h2 id="acciones" className="mb-3 text-xl">Acciones</h2>
            <StationCommands id={s.id} status={s.status} featured={s.is_featured} verification={s.verification_status} deleted={Boolean(s.deleted_at)} isAdmin={staff.role !== 'editor'} websiteUrl={s.website_url ?? null} /></section>
          <section aria-labelledby="datos"><h2 id="datos" className="mb-3 text-xl">Datos de la radio</h2>
            <StationForm station={s} countries={c.data ?? []} categories={k.data ?? []} extraIds={(extra.data ?? []).map((e) => e.category_id)} /></section>
        </div>
        <aside className="grid content-start gap-8">
          <section aria-labelledby="web">
            <h2 id="web" className="mb-3 text-xl">Certificado HTTPS del sitio oficial</h2>
            {!s.website_url ? <p className="text-sm text-ink/70">No hay sitio web cargado.</p> : websiteCurrent ? (
              <div className="rounded-xl border border-ok/40 bg-[#E6F2EC] p-4 text-sm" role="status">
                <p className="font-semibold text-ok">HTTPS válido al momento de la comprobación</p>
                <p className="mt-1">Verificado el {fmtDate(s.website_verified_at)}.</p>
                <p className="mt-1 text-ink/70">La comprobación confirma que el sitio respondió mediante HTTPS con un certificado válido. La verificación vence a los 30 días.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-line p-4 text-sm">
                <p className="font-semibold">{s.website_is_secure && s.website_verified_at ? 'La verificación HTTPS está vencida' : 'El certificado todavía no fue verificado'}</p>
                <p className="mt-1 text-ink/70">El sitio oficial permanece oculto al público hasta completar una nueva comprobación satisfactoria.</p>
                {s.website_verified_at && <p className="mt-1 text-ink/70">Última comprobación correcta: {fmtDate(s.website_verified_at)}.</p>}
              </div>
            )}
            {websiteEvents.error ? <p className="mt-3 text-sm text-danger">No se pudo cargar el diagnóstico del certificado.</p> : websiteEvent ? (
              <div className="mt-3 rounded-xl border border-line p-4 text-sm">
                <p className="font-semibold">Último diagnóstico: {({ invalid_certificate: 'Certificado inválido', insecure_redirect: 'Redirección insegura', insecure_url: 'URL insegura', unreachable: 'Sitio no disponible', recovered: 'HTTPS recuperado' } as Record<string, string>)[websiteEvent.outcome] ?? websiteEvent.outcome}</p>
                <p className="mt-1 text-ink/70">{websiteEvent.detail}</p>
                <p className="mt-2 text-ink/60">Comprobado el {fmtDate(websiteEvent.checked_at)}{websiteEvent.http_status ? ` · HTTP ${websiteEvent.http_status}` : ''}{` · ${websiteEvent.duration_ms} ms`}</p>
                {websiteEvent.error_code && <p className="mt-2">Código TLS: <code className="rounded bg-ink/5 px-1 py-0.5">{websiteEvent.error_code}</code></p>}
                {websiteEvent.final_url && <p className="mt-1 break-all text-ink/70">URL final: <a href={websiteEvent.final_url} target="_blank" rel="noreferrer" className="text-sky hover:underline">{websiteEvent.final_url}</a></p>}
              </div>
            ) : <p className="mt-3 text-sm text-ink/60">Todavía no hay diagnósticos registrados.</p>}
          </section>
          <section aria-labelledby="ver"><h2 id="ver" className="mb-3 text-xl">Última prueba del stream</h2>
            {last?.manual ? <p className="text-sm">Verificada manualmente por {last.verified_by} el {fmtDate(s.last_verified_at)}.</p>
              : last ? <VerifyResultView r={last} /> : <p className="text-sm text-ink/70">Este stream todavía no se ha verificado.</p>}</section>
          <section aria-labelledby="hist"><h2 id="hist" className="mb-3 text-xl">Historial de estados</h2>
            <ul className="grid gap-2 text-sm">{(logs.data ?? []).map((l) => <li key={l.id}>{l.from_status ? `${STATUS_LABEL[l.from_status]} → ` : 'Creada como '}<strong>{STATUS_LABEL[l.to_status]}</strong><span className="block text-ink/60">{fmtDate(l.created_at)}</span></li>)}</ul></section>
        </aside>
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { STATUS_LABEL, VERIFICATION_LABEL, fmtDate } from '@/lib/labels';
import { PageHeader } from '@/components/ui';
import { StationForm } from '@/components/admin/StationForm';
import { StationCommands } from '@/components/admin/StationCommands';
import { VerifyResultView } from '@/components/admin/VerifyResultView';
import type { VerifyResult } from '@/lib/security/verify-stream';

export const metadata: Metadata = { title: 'Editar radio' };
export default async function EditStation({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(); const { id } = await params; const supabase = await createClient();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: s } = await supabase.from('stations').select('*').eq('id', id).maybeSingle();
  if (!s) notFound();
  const [c, k, extra, logs] = await Promise.all([
    supabase.from('countries').select('id,code,name,slug').order('name'), supabase.from('categories').select('id,name,slug,description').order('display_order'),
    supabase.from('station_categories').select('category_id').eq('station_id', id),
    supabase.from('station_status_logs').select('id, from_status, to_status, created_at').eq('station_id', id).order('created_at', { ascending: false }).limit(8)]);
  const last = s.last_verification_result as (VerifyResult & { manual?: boolean; verified_by?: string }) | null;
  return (
    <>
      <PageHeader title={s.name} crumb={{ href: '/admin/radios', label: 'Radios' }} intro={<>
        <span className="badge mr-2">{STATUS_LABEL[s.status]}</span><span className="badge mr-2">{VERIFICATION_LABEL[s.verification_status]}</span>
        {s.status === 'published' && <Link href={`/radios/${s.slug}`} className="text-sky hover:underline">Ver en el sitio</Link>}{s.deleted_at && <span className="badge">Eliminada</span>}</>} />
      <div className="wrap grid gap-10 py-8 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-8">
          <section aria-labelledby="acciones"><h2 id="acciones" className="mb-3 text-xl">Acciones</h2>
            <StationCommands id={s.id} status={s.status} featured={s.is_featured} verification={s.verification_status} deleted={Boolean(s.deleted_at)} isAdmin={staff.role !== 'editor'} websiteUrl={s.website_url ?? null} /></section>
          <section aria-labelledby="datos"><h2 id="datos" className="mb-3 text-xl">Datos de la radio</h2>
            <StationForm station={s} countries={c.data ?? []} categories={k.data ?? []} extraIds={(extra.data ?? []).map((e) => e.category_id)} /></section>
        </div>
        <aside className="grid content-start gap-8">
          <section aria-labelledby="web"><h2 id="web" className="mb-3 text-xl">Seguridad del sitio oficial</h2><p className="text-sm text-ink/70">{s.website_url ? (s.website_is_secure ? 'HTTPS comprobado; el botón puede mostrarse.' : 'No verificado: el sitio oficial permanece oculto al público.') : 'No hay sitio web cargado.'}</p></section>
          <section aria-labelledby="ver"><h2 id="ver" className="mb-3 text-xl">Última verificación</h2>
            {last?.manual ? <p className="text-sm">Verificada manualmente por {last.verified_by} el {fmtDate(s.last_verified_at)}.</p>
              : last ? <VerifyResultView r={last} /> : <p className="text-sm text-ink/70">Este enlace todavía no se ha verificado.</p>}</section>
          <section aria-labelledby="hist"><h2 id="hist" className="mb-3 text-xl">Historial de estados</h2>
            <ul className="grid gap-2 text-sm">{(logs.data ?? []).map((l) => <li key={l.id}>{l.from_status ? `${STATUS_LABEL[l.from_status]} → ` : 'Creada como '}<strong>{STATUS_LABEL[l.to_status]}</strong><span className="block text-ink/60">{fmtDate(l.created_at)}</span></li>)}</ul></section>
        </aside>
      </div>
    </>
  );
}

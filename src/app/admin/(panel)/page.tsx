import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ACTION_LABEL, ENTITY_LABEL, fmtDate } from '@/lib/labels';
import { PageHeader, SectionHeading } from '@/components/ui';

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ acceso?: string }> }) {
  await requireStaff(); const supabase = await createClient(); const sp = await searchParams;
  const [stats, subs, logs] = await Promise.all([
    supabase.rpc('admin_stats'),
    supabase.from('station_submissions').select('id, station_name, created_at, country:countries(name)').eq('status', 'pending').order('created_at', { ascending: false }).limit(5),
    supabase.from('audit_logs').select('id, actor_id, action, entity_type, created_at, details').order('created_at', { ascending: false }).limit(10),
  ]);
  const st = (stats.data ?? {}) as Record<string, number>;
  const actorIds = [...new Set((logs.data ?? []).map((l) => l.actor_id).filter(Boolean))];
  const { data: profiles } = actorIds.length ? await supabase.from('admin_profiles').select('id, display_name').in('id', actorIds) : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  const tiles: [string, string, string][] = [['Total de radios', 'stations_total', '/admin/radios'], ['Publicadas', 'published', '/admin/radios?estado=published'], ['En revisión', 'pending', '/admin/radios?estado=pending_review'],
    ['Borradores', 'draft', '/admin/radios?estado=draft'], ['Suspendidas', 'suspended', '/admin/radios?estado=suspended'], ['Sin verificar', 'unverified', '/admin/radios'],
    ['Solicitudes pendientes', 'submissions_pending', '/admin/solicitudes'], ['Países activos', 'countries', '/admin/paises'], ['Categorías activas', 'categories', '/admin/categorias']];
  return (
    <>
      <PageHeader title="Resumen" />
      <div className="wrap grid gap-12 py-8">
        {sp.acceso === 'denegado' && <p role="alert" className="rounded-xl bg-[#F8E5E3] px-4 py-3 text-danger">Tu rol no tiene permiso para esa sección.</p>}
        {stats.error && <p role="alert" className="rounded-xl bg-[#F8E5E3] px-4 py-3 text-danger">No se pudieron cargar las estadísticas.</p>}
        <div className="grid gap-3 md:grid-cols-2"><Link href="/admin/diagnostico" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy/20 bg-white p-5 hover:border-navy"><div><h2 className="text-xl">Centro de resolución</h2><p className="mt-1 text-sm text-ink/70">Detectá fallos en streams y sitios oficiales, y volvé a comprobarlos desde un solo lugar.</p></div><span className="font-semibold text-sky">Abrir centro →</span></Link><Link href="/admin/calidad" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-5 hover:border-navy"><div><h2 className="text-xl">Calidad del catálogo</h2><p className="mt-1 text-sm text-ink/70">Encontrá fichas sin logo, descripción, ciudad o sitio oficial.</p></div><span className="font-semibold text-sky">Auditar fichas →</span></Link></div>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">{tiles.map(([label, key, href]) => (
          <Link key={key} href={href} className="rounded-2xl border border-line bg-white p-4 hover:border-navy"><dt className="text-sm text-ink/70">{label}</dt><dd className="mt-1 font-display text-4xl">{st[key] ?? 0}</dd></Link>))}</dl>
        <section><SectionHeading title="Solicitudes recientes" href="/admin/solicitudes" />
          {(subs.data ?? []).length === 0 ? <p className="text-ink/70">No hay solicitudes pendientes.</p> :
            <ul className="divide-y divide-line rounded-2xl border border-line bg-white">{(subs.data ?? []).map((s) => (
              <li key={s.id}><Link href={`/admin/solicitudes/${s.id}`} className="flex flex-wrap justify-between gap-2 px-4 py-3 hover:bg-gold-soft/40"><span className="font-semibold">{s.station_name}</span><span className="text-sm text-ink/70">{(s.country as unknown as { name: string } | null)?.name} · {fmtDate(s.created_at)}</span></Link></li>))}</ul>}</section>
        <section><SectionHeading title="Actividad reciente" />
          {(logs.data ?? []).length === 0 ? <p className="text-ink/70">Aún no hay actividad registrada.</p> :
            <ul className="divide-y divide-line rounded-2xl border border-line bg-white text-sm">{(logs.data ?? []).map((l) => (
              <li key={l.id} className="px-4 py-3"><span className="font-semibold">{names.get(l.actor_id) ?? 'Alguien'}</span> {ACTION_LABEL[l.action] ?? l.action} {ENTITY_LABEL[l.entity_type] ?? l.entity_type}
                {l.action === 'update' && l.details && <span className="text-ink/60"> (campos: {Object.keys(l.details as object).join(', ')})</span>}<span className="block text-ink/60">{fmtDate(l.created_at)}</span></li>))}</ul>}</section>
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { STATUS_LABEL, VERIFICATION_LABEL } from '@/lib/labels';
import { Pagination } from '@/components/Pagination';
import { EmptyState, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Radios' };
const SIZE = 25; type SP = Promise<{ q?: string; estado?: string; orden?: string; pagina?: string }>;

export default async function AdminStations({ searchParams }: { searchParams: SP }) {
  await requireStaff(); const sp = await searchParams; const supabase = await createClient();
  const page = Math.max(1, parseInt(sp.pagina ?? '1', 10) || 1); const q = (sp.q ?? '').trim().slice(0, 80);
  const estado = Object.keys(STATUS_LABEL).includes(sp.estado ?? '') ? sp.estado : undefined;
  let query = supabase.from('stations').select('id, name, status, verification_status, is_featured, is_demo, last_verified_at, country:countries(name), category:categories!primary_category_id(name)', { count: 'exact' }).is('deleted_at', null);
  if (q) query = query.ilike('name', `%${q.replace(/[\\%_]/g, '\\$&')}%`);
  if (estado) query = query.eq('status', estado);
  query = sp.orden === 'recientes' ? query.order('created_at', { ascending: false }) : query.order('name');
  const { data, count, error } = await query.range((page - 1) * SIZE, page * SIZE - 1);
  return (
    <>
      <PageHeader title="Radios" />
      <div className="wrap py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div><label htmlFor="q" className="label">Buscar</label><input id="q" name="q" defaultValue={q} className="field" /></div>
            <div><label htmlFor="estado" className="label">Estado</label><select id="estado" name="estado" defaultValue={estado ?? ''} className="field"><option value="">Todos</option>{Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label htmlFor="orden" className="label">Orden</label><select id="orden" name="orden" defaultValue={sp.orden ?? ''} className="field"><option value="">Nombre</option><option value="recientes">Más recientes</option></select></div>
            <button className="btn btn-dark">Filtrar</button>
          </form>
          <Link href="/admin/radios/nueva" className="btn btn-primary">Nueva radio</Link>
        </div>
        {error && <p role="alert" className="mb-4 text-danger">No se pudo cargar la lista.</p>}
        {(data ?? []).length === 0 ? <EmptyState title="No hay radios con estos filtros" action={<Link href="/admin/radios/nueva" className="btn btn-primary">Crear una radio</Link>} /> :
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white">{(data ?? []).map((s) => (
            <li key={s.id}><Link href={`/admin/radios/${s.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-gold-soft/40">
              <span><span className="font-semibold">{s.name}</span>{s.is_demo && <span className="badge ml-2">DEMO</span>}{s.is_featured && <span className="badge ml-2">Destacada</span>}
                <span className="block text-sm text-ink/70">{(s.country as unknown as { name: string } | null)?.name} · {(s.category as unknown as { name: string } | null)?.name}</span></span>
              <span className="flex gap-2 text-sm"><span className="badge">{STATUS_LABEL[s.status]}</span><span className="badge">{VERIFICATION_LABEL[s.verification_status]}</span></span></Link></li>))}</ul>}
        <Pagination basePath="/admin/radios" params={{ q: q || undefined, estado, orden: sp.orden }} page={page} total={count ?? 0} pageSize={SIZE} />
      </div>
    </>
  );
}

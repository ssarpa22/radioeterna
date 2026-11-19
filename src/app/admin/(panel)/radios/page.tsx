import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { STATUS_LABEL, VERIFICATION_LABEL, fmtDate } from '@/lib/labels';
import { isWebsiteVerificationCurrent } from '@/lib/security/website-verification';
import { Pagination } from '@/components/Pagination';
import { EmptyState, PageHeader } from '@/components/ui';
import { PlayButton } from '@/components/player/PlayButton';
import { BulkPublishStations } from '@/components/admin/BulkPublishStations';

export const metadata: Metadata = { title: 'Radios' };
const SIZE = 25; type SP = Promise<{ q?: string; estado?: string; orden?: string; pagina?: string }>;

export default async function AdminStations({ searchParams }: { searchParams: SP }) {
  await requireStaff(); const sp = await searchParams; const supabase = await createClient();
  const page = Math.max(1, parseInt(sp.pagina ?? '1', 10) || 1); const q = (sp.q ?? '').trim().slice(0, 80);
  const estado = Object.keys(STATUS_LABEL).includes(sp.estado ?? '') ? sp.estado : undefined;
  let query = supabase.from('stations').select('id, name, slug, stream_url, stream_format, logo_url, website_url, website_is_secure, website_verified_at, status, verification_status, is_featured, is_demo, last_verified_at, country:countries(name), category:categories!primary_category_id(name)', { count: 'exact' }).is('deleted_at', null);
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
        <BulkPublishStations stations={(data ?? []).filter((station) => station.status === 'draft' && (station.verification_status === 'verified' || station.verification_status === 'manual')).map(({ id, name }) => ({ id, name }))} />
        {(data ?? []).length === 0 ? <EmptyState title="No hay radios con estos filtros" action={<Link href="/admin/radios/nueva" className="btn btn-primary">Crear una radio</Link>} /> :
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white">{(data ?? []).map((s) => {
            const countryName = (s.country as unknown as { name: string } | null)?.name;
            const websiteCurrent = isWebsiteVerificationCurrent(s.website_is_secure, s.website_verified_at);
            const websiteLabel = !s.website_url ? 'Sin sitio oficial' : websiteCurrent ? `HTTPS válido · ${fmtDate(s.website_verified_at)}` : s.website_is_secure && s.website_verified_at ? 'HTTPS: verificación vencida' : 'HTTPS: pendiente';
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-gold-soft/40">
                <Link href={`/admin/radios/${s.id}`} className="min-w-0 flex-1">
                  <span className="font-semibold">{s.name}</span>{s.is_demo && <span className="badge ml-2">DEMO</span>}{s.is_featured && <span className="badge ml-2">Destacada</span>}
                  <span className="block text-sm text-ink/70">{countryName} · {(s.category as unknown as { name: string } | null)?.name}</span>
                  <span className="mt-1 flex flex-wrap gap-2 text-sm">
                    <span className="badge">{STATUS_LABEL[s.status]}</span>
                    <span className="badge">Stream: {VERIFICATION_LABEL[s.verification_status]}</span>
                    <span className="badge">{websiteLabel}</span>
                  </span>
                </Link>
                {s.status === 'draft' && s.stream_url && (
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden text-xs text-ink/60 sm:inline">Probar audio</span>
                    <PlayButton station={{ id: s.id, name: s.name, slug: s.slug, logo_url: s.logo_url, stream_url: s.stream_url, stream_format: s.stream_format, country_name: countryName }} />
                  </div>
                )}
              </li>
            );
          })}</ul>}
        <Pagination basePath="/admin/radios" params={{ q: q || undefined, estado, orden: sp.orden }} page={page} total={count ?? 0} pageSize={SIZE} />
      </div>
    </>
  );
}

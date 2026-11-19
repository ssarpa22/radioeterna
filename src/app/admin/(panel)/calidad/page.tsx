import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui';
import { Pagination } from '@/components/Pagination';
import { STATUS_LABEL } from '@/lib/labels';

export const metadata: Metadata = { title: 'Calidad del catálogo' };
const SIZE = 25;
const ISSUES = {
  logo: { label: 'Sin logo', description: 'No tiene una imagen de identificación.' },
  descripcion: { label: 'Descripción incompleta', description: 'Falta la descripción corta o la descripción completa.' },
  ciudad: { label: 'Sin ciudad', description: 'No se indicó la ciudad de origen.' },
  sitio: { label: 'Sin sitio oficial', description: 'No hay un sitio web oficial cargado.' },
} as const;
type Issue = keyof typeof ISSUES;
type Params = { q?: string; problema?: string; estado?: string; pagina?: string };
const validIssue = (value?: string): Issue | undefined => value && value in ISSUES ? value as Issue : undefined;
const validStatus = (value?: string) => value && Object.hasOwn(STATUS_LABEL, value) ? value : undefined;

export default async function CatalogQuality({ searchParams }: { searchParams: Promise<Params> }) {
  await requireStaff();
  const sp = await searchParams;
  const supabase = await createClient();
  const issue = validIssue(sp.problema);
  const status = validStatus(sp.estado);
  const q = (sp.q ?? '').trim().slice(0, 80);
  const page = Math.max(1, Math.min(10000, parseInt(sp.pagina ?? '1', 10) || 1));

  const base = () => {
    let query = supabase.from('stations').select('id', { count: 'exact', head: true }).is('deleted_at', null);
    if (status) query = query.eq('status', status);
    if (q) query = query.ilike('name', `%${q.replace(/[\\%_]/g, '\\$&')}%`);
    return query;
  };
  const applyIssue = (query: ReturnType<typeof base>, kind?: Issue) => {
    if (kind === 'logo') return query.is('logo_url', null);
    if (kind === 'descripcion') return query.or('short_description.is.null,description.is.null');
    if (kind === 'ciudad') return query.is('city', null);
    if (kind === 'sitio') return query.is('website_url', null);
    return query;
  };
  const countFor = async (kind?: Issue) => await applyIssue(base(), kind);
  const [allResult, logoResult, descriptionResult, cityResult, websiteResult] = await Promise.all([
    base(), countFor('logo'), countFor('descripcion'), countFor('ciudad'), countFor('sitio'),
  ]);
  const counts = {
    total: allResult.count ?? 0,
    logo: logoResult.count ?? 0,
    descripcion: descriptionResult.count ?? 0,
    ciudad: cityResult.count ?? 0,
    sitio: websiteResult.count ?? 0,
  };

  let listQuery = supabase.from('stations')
    .select('id,name,slug,status,logo_url,short_description,description,city,website_url,country:countries(name)', { count: 'exact' })
    .is('deleted_at', null);
  if (status) listQuery = listQuery.eq('status', status);
  if (q) listQuery = listQuery.ilike('name', `%${q.replace(/[\\%_]/g, '\\$&')}%`);
  if (issue === 'logo') listQuery = listQuery.is('logo_url', null);
  if (issue === 'descripcion') listQuery = listQuery.or('short_description.is.null,description.is.null');
  if (issue === 'ciudad') listQuery = listQuery.is('city', null);
  if (issue === 'sitio') listQuery = listQuery.is('website_url', null);
  const { data, count, error } = await listQuery.order('status').order('name').range((page - 1) * SIZE, page * SIZE - 1);
  const filters = new URLSearchParams();
  if (q) filters.set('q', q);
  if (status) filters.set('estado', status);
  const href = (kind?: Issue) => {
    const params = new URLSearchParams(filters);
    if (kind) params.set('problema', kind);
    const suffix = params.toString();
    return `/admin/calidad${suffix ? `?${suffix}` : ''}`;
  };

  return (
    <>
      <PageHeader title="Calidad del catálogo" intro="Encontrá fichas incompletas y mejorá la presentación de las emisoras. Estos indicadores no afectan su publicación ni sus verificaciones técnicas." />
      <div className="wrap grid gap-7 py-8">
        {allResult.error && <p role="alert" className="rounded-xl bg-[#F8E5E3] px-4 py-3 text-danger">No se pudieron calcular los indicadores de calidad.</p>}
        <section aria-label="Resumen de calidad">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl">Problemas detectados</h2>
            <span className="text-sm text-ink/60">{counts.total} fichas en el catálogo{status ? ` · ${STATUS_LABEL[status]}` : ''}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(Object.entries(ISSUES) as [Issue, typeof ISSUES[Issue]][]).map(([key, item]) => (
              <Link key={key} href={href(key)} aria-current={issue === key ? 'page' : undefined}
                className={`rounded-2xl border bg-white p-4 transition hover:border-navy ${issue === key ? 'border-navy ring-1 ring-navy' : 'border-line'}`}>
                <dt className="text-sm text-ink/70">{item.label}</dt>
                <dd className="mt-1 font-display text-4xl">{counts[key]}</dd>
                <p className="mt-1 text-xs text-ink/60">{item.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <form method="get" className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-white p-4">
            <div><label htmlFor="q" className="label">Buscar emisora</label><input id="q" name="q" defaultValue={q} className="field" /></div>
            <div><label htmlFor="estado" className="label">Estado</label><select id="estado" name="estado" defaultValue={status ?? ''} className="field"><option value="">Todos</option>{Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            {issue && <input type="hidden" name="problema" value={issue} />}
            <button className="btn btn-dark">Aplicar</button>
            <Link href="/admin/calidad" className="btn btn-ghost">Limpiar</Link>
          </form>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl">{issue ? ISSUES[issue].label : 'Todas las fichas con problemas'}</h2>
            <span className="text-sm text-ink/60">{count ?? 0} resultado(s)</span>
          </div>
          {error ? <p role="alert" className="rounded-xl bg-[#F8E5E3] px-4 py-3 text-danger">No se pudo cargar la lista de emisoras.</p> :
            (data ?? []).length === 0 ? <div className="rounded-2xl border border-line bg-white p-6 text-sm text-ink/70">{issue ? 'No hay emisoras con este problema y estos filtros.' : 'No se encontraron emisoras con datos incompletos.'}</div> :
            <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
              {(data ?? []).map((station) => {
                const missing: string[] = [];
                if (!station.logo_url) missing.push('Logo');
                if (!station.short_description || !station.description) missing.push('Descripción');
                if (!station.city) missing.push('Ciudad');
                if (!station.website_url) missing.push('Sitio oficial');
                const country = station.country as unknown as { name: string } | null;
                return <li key={station.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{station.name}</p>
                    <p className="mt-1 text-sm text-ink/60">{country?.name ?? 'País sin identificar'} · {STATUS_LABEL[station.status]}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">{missing.map((label) => <span key={label} className="badge badge-warning">{label} faltante</span>)}</div>
                  </div>
                  <Link href={`/admin/radios/${station.id}`} className="shrink-0 text-sm font-semibold text-sky hover:underline">Completar ficha →</Link>
                </li>;
              })}
            </ul>}
          <Pagination basePath="/admin/calidad" params={{ q: q || undefined, estado: status, problema: issue }} page={page} total={count ?? 0} pageSize={SIZE} />
        </section>
        <p className="text-xs text-ink/50">La auditoría revisa metadatos editoriales. No prueba el audio, no comprueba certificados HTTPS y no cambia estados de publicación.</p>
      </div>
    </>
  );
}

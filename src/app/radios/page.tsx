import type { Metadata } from 'next';
import { listCategories, listCountries, searchStations } from '@/lib/data/stations';
import { stationSearchSchema } from '@/lib/validation/schemas';
import { SearchForm } from '@/components/SearchForm';
import { StationList } from '@/components/StationRow';
import { Pagination } from '@/components/Pagination';
import { EmptyState, PageHeader } from '@/components/ui';
import { buildDirectoryItemList, serializeJsonLd } from '@/lib/seo/directory';
import Link from 'next/link';

const PAGE_SIZE = 20;
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const parse = async (sp: Props['searchParams']) => {
  const r = await sp;
  return stationSearchSchema.parse({ q: first(r.q), pais: first(r.pais), categoria: first(r.categoria), pagina: first(r.pagina), orden: first(r.orden) });
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const f = await parse(searchParams);
  const filtered = Boolean(f.q || f.pais || f.categoria || f.pagina > 1 || f.orden !== 'name');
  return {
    title: 'Radios cristianas en vivo', description: 'Directorio de radios cristianas y evangélicas. Busca por nombre, país o categoría y escucha en vivo.',
    alternates: { canonical: '/radios' },
    robots: filtered ? { index: false, follow: true } : undefined, // filtered/paged variants are not indexed (avoid duplicates)
  };
}

export default async function RadiosPage({ searchParams }: Props) {
  const f = await parse(searchParams);
  const [countries, categories, result] = await Promise.all([listCountries(), listCategories(), searchStations({ ...f, limite: PAGE_SIZE })]);
  const itemList = buildDirectoryItemList(result.items, '/radios', result.total);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemList) }} />
      <PageHeader title="Radios cristianas en vivo" intro="Busca por nombre y filtra por país o categoría." />
      <div className="wrap py-8">
        <SearchForm countries={countries} categories={categories} values={f} compact />
        <p className="mb-4 mt-8 text-sm text-ink/70" role="status">{result.total === 1 ? '1 radio encontrada' : `${result.total} radios encontradas`}</p>
        {result.items.length > 0 ? (
          <>
            <StationList items={result.items} />
            <Pagination basePath="/radios" params={{ q: f.q, pais: f.pais, categoria: f.categoria, orden: f.orden === 'name' ? undefined : f.orden }} page={result.page} total={result.total} pageSize={PAGE_SIZE} />
          </>
        ) : (
          <EmptyState title="No encontramos radios con esos filtros" action={<Link href="/radios" className="btn btn-ghost">Quitar filtros</Link>}>Prueba con otro nombre o elige todos los países y categorías.</EmptyState>
        )}
      </div>
    </>
  );
}

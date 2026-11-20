import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { listCountries, searchStations } from '@/lib/data/stations';
import { StationList } from '@/components/StationRow';
import { Pagination } from '@/components/Pagination';
import { EmptyState, PageHeader } from '@/components/ui';
import { buildDirectoryItemList, serializeJsonLd } from '@/lib/seo/directory';
import Link from 'next/link';

const PAGE_SIZE = 20;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ pagina?: string }> };
const page = (p?: string) => Math.min(10_000, Math.max(1, parseInt(p ?? '1', 10) || 1));

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params; const pg = page((await searchParams).pagina);
  const country = (await listCountries()).find((c) => c.slug === slug);
  if (!country) return { title: 'País no encontrado', robots: { index: false } };
  const { total } = await searchStations({ pais: slug, limite: 1 });
  return { title: `Radios cristianas de ${country.name}`, description: `Escucha en vivo radios cristianas y evangélicas de ${country.name}.`,
    alternates: { canonical: `/paises/${slug}` }, robots: total === 0 || pg > 1 ? { index: false, follow: true } : undefined };
}

export default async function CountryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const country = (await listCountries()).find((c) => c.slug === slug);
  if (!country) notFound();
  const result = await searchStations({ pais: slug, pagina: page((await searchParams).pagina), limite: PAGE_SIZE });
  const itemList = buildDirectoryItemList(result.items, `/paises/${slug}`, result.total);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemList) }} />
      <PageHeader title={`Radios cristianas de ${country.name}`} crumb={{ href: '/paises', label: 'Todos los países' }} intro={result.total > 0 ? `${result.total} ${result.total === 1 ? 'radio' : 'radios'} para escuchar en vivo.` : undefined} />
      <div className="wrap py-8">
        {result.items.length > 0 ? <><StationList items={result.items} /><Pagination basePath={`/paises/${slug}`} params={{}} page={result.page} total={result.total} pageSize={PAGE_SIZE} /></> :
          <EmptyState title={`Aún no hay radios de ${country.name}`} action={<Link href="/radios" className="btn btn-ghost">Ver todas las radios</Link>}>Estamos sumando radios de cada país.</EmptyState>}
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { listCategories, searchStations } from '@/lib/data/stations';
import { StationList } from '@/components/StationRow';
import { Pagination } from '@/components/Pagination';
import { EmptyState, PageHeader } from '@/components/ui';
import { buildDirectoryItemList, getCategoryDescription, getDirectoryPageMetadata, serializeJsonLd } from '@/lib/seo/directory';

const PAGE_SIZE = 20;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ pagina?: string }> };
const page = (p?: string) => Math.min(10_000, Math.max(1, parseInt(p ?? '1', 10) || 1));

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params; const pg = page((await searchParams).pagina);
  const cat = (await listCategories()).find((c) => c.slug === slug);
  if (!cat) return { title: 'Categoría no encontrada', robots: { index: false } };
  const { total } = await searchStations({ categoria: slug, limite: 1 });
  const pageMetadata = getDirectoryPageMetadata(`/categorias/${slug}`, pg, total, PAGE_SIZE);
  return { title: `${cat.name}: radios cristianas en vivo`, description: getCategoryDescription(cat.slug, cat.name, cat.description),
    alternates: { canonical: pageMetadata.canonical }, robots: pageMetadata.robots };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const cat = (await listCategories()).find((c) => c.slug === slug);
  if (!cat) notFound();
  const result = await searchStations({ categoria: slug, pagina: page((await searchParams).pagina), limite: PAGE_SIZE });
  const itemList = buildDirectoryItemList(result.items, result.total);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemList) }} />
      <PageHeader title={cat.name} crumb={{ href: '/categorias', label: 'Todas las categorías' }} intro={getCategoryDescription(cat.slug, cat.name, cat.description)} />
      <div className="wrap py-8">
        {result.items.length > 0 ? <><StationList items={result.items} /><Pagination basePath={`/categorias/${slug}`} params={{}} page={result.page} total={result.total} pageSize={PAGE_SIZE} /></> :
          <EmptyState title="Aún no hay radios en esta categoría" action={<Link href="/radios" className="btn btn-ghost">Ver todas las radios</Link>}>Vuelve pronto o explora otras categorías.</EmptyState>}
      </div>
    </>
  );
}

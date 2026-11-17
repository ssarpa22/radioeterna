import type { Metadata } from 'next';
import Link from 'next/link';
import { getCounts, listCategories } from '@/lib/data/stations';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Radios cristianas por categoría', description: 'Alabanza, gospel, enseñanza bíblica y más: explora radios cristianas por categoría.', alternates: { canonical: '/categorias' } };

export default async function CategoriesPage() {
  const [categories, counts] = await Promise.all([listCategories(), getCounts()]);
  return (
    <>
      <PageHeader title="Radios por categoría" intro="Desde alabanza y adoración hasta enseñanza bíblica." />
      <ul className="wrap grid gap-x-8 gap-y-1 py-8 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <li key={c.id} className="border-b border-line"><Link href={`/categorias/${c.slug}`} className="flex min-h-[56px] items-baseline justify-between gap-3 py-3 hover:text-gold-deep">
            <span className="font-display text-xl">{c.name}</span><span className="text-sm text-ink/60">{counts.categories[c.slug] ?? 0}</span></Link></li>
        ))}
      </ul>
    </>
  );
}

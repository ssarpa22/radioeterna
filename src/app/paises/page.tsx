import type { Metadata } from 'next';
import Link from 'next/link';
import { getCounts, listCountries } from '@/lib/data/stations';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Radios cristianas por país', description: 'Explora radios cristianas y evangélicas por país en Radio Eterna.', alternates: { canonical: '/paises' } };

export default async function CountriesPage() {
  const [countries, counts] = await Promise.all([listCountries(), getCounts()]);
  return (
    <>
      <PageHeader title="Radios por país" intro="Elige un país para ver sus radios cristianas y evangélicas." />
      <ul className="wrap grid gap-x-8 gap-y-1 py-8 sm:grid-cols-2 lg:grid-cols-3">
        {countries.map((c) => (
          <li key={c.id} className="border-b border-line"><Link href={`/paises/${c.slug}`} className="flex min-h-[56px] items-baseline justify-between py-3 hover:text-gold-deep">
            <span className="font-display text-xl">{c.name}</span><span className="text-sm text-ink/60">{counts.countries[c.slug] ?? 0} {(counts.countries[c.slug] ?? 0) === 1 ? 'radio' : 'radios'}</span></Link></li>
        ))}
      </ul>
    </>
  );
}

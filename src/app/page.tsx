import Link from 'next/link';
import { getCounts, listCategories, listCountries, searchStations } from '@/lib/data/stations';
import { SearchForm } from '@/components/SearchForm';
import { StationList } from '@/components/StationRow';
import { EmptyState, SectionHeading } from '@/components/ui';

export default async function HomePage() {
  const [countries, categories, counts, featured, recent] = await Promise.all([
    listCountries(), listCategories(), getCounts(),
    searchStations({ destacadas: true, limite: 4 }), searchStations({ orden: 'recent', limite: 6 }),
  ]);
  const activeCountries = countries.filter((c) => (counts.countries[c.slug] ?? 0) > 0);
  return (
    <>
      <section className="bg-ink text-paper">
        <div className="wrap pb-10 pt-12 sm:pt-20">
          <h1 className="max-w-3xl text-4xl leading-[1.05] sm:text-6xl">Radio cristiana en vivo, de todo el mundo hispano.</h1>
          <p className="mt-5 max-w-xl text-lg text-paper/80">Encuentra una radio evangélica por nombre, país o categoría y escúchala sin salir de la página.</p>
          <div className="mt-8 rounded-2xl bg-paper p-4 text-ink sm:p-5"><SearchForm countries={countries} categories={categories} /></div>
        </div>
        {activeCountries.length > 0 && (
          <div className="pb-8">
            <div className="dial wrap" aria-hidden />
            <ul className="wrap mt-3 flex gap-2 overflow-x-auto pb-2" aria-label="Países con radios">
              {activeCountries.map((c) => (
                <li key={c.id} className="shrink-0"><Link href={`/paises/${c.slug}`} className="inline-flex min-h-[40px] items-center rounded-full border border-gold/50 px-4 text-sm font-medium text-gold hover:bg-gold hover:text-ink">{c.name}</Link></li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="wrap grid gap-16 pt-14">
        {featured.items.length > 0 && (
          <section aria-labelledby="destacadas"><div id="destacadas"><SectionHeading title="Radios destacadas" href="/radios" linkLabel="Ver todas las radios" /></div>
            <StationList items={featured.items} feature /></section>
        )}

        <section aria-labelledby="categorias"><div id="categorias"><SectionHeading title="Explora por categoría" href="/categorias" /></div>
          <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <li key={c.id} className="border-b border-line">
                <Link href={`/categorias/${c.slug}`} className="flex min-h-[56px] items-baseline justify-between gap-3 py-3 hover:text-gold-deep">
                  <span className="font-display text-xl">{c.name}</span><span className="text-sm text-ink/60">{counts.categories[c.slug] ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul></section>

        <section aria-labelledby="recientes"><div id="recientes"><SectionHeading title="Agregadas recientemente" /></div>
          {recent.items.length > 0 ? <StationList items={recent.items} /> :
            <EmptyState title="Aún no hay radios publicadas" action={<Link href="/radios" className="btn btn-ghost">Ir al directorio</Link>}>Cuando se publiquen radios, aparecerán aquí.</EmptyState>}
        </section>

        <section className="rounded-3xl bg-navy px-6 py-10 text-paper sm:px-12">
          <h2 className="max-w-xl text-3xl">¿Tienes una radio cristiana?</h2>
          <p className="mt-3 max-w-xl text-paper/80">Solicita que tu radio aparezca en Radio Eterna. Revisamos cada solicitud antes de publicarla.</p>
          <Link href="/sumar-radio" className="btn btn-primary mt-6">Solicitar inclusión</Link>
        </section>
      </div>
    </>
  );
}

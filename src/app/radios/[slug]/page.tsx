import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, MapPin } from 'lucide-react';
import { getStationBySlug, searchStations } from '@/lib/data/stations';
import { absoluteUrl } from '@/lib/site';
import { PlayButton } from '@/components/player/PlayButton';
import { FavoriteButton } from '@/components/FavoriteButton';
import { StationLogo } from '@/components/StationLogo';
import { StationList } from '@/components/StationRow';
import { SectionHeading } from '@/components/ui';

type Props = { params: Promise<{ slug: string }> };
type Rel = { name: string; slug: string } | null;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getStationBySlug((await params).slug);
  if (!s) return { title: 'Radio no encontrada', robots: { index: false } };
  const country = (s.country as Rel)?.name;
  const desc = s.short_description ?? `Escucha ${s.name}${country ? `, radio cristiana de ${country},` : ''} en vivo en Radio Eterna.`;
  return {
    title: `${s.name}${country ? ` · Radio en vivo, ${country}` : ' · Radio en vivo'}`, description: desc,
    alternates: { canonical: `/radios/${s.slug}` },
    openGraph: { type: 'website', title: s.name, description: desc, url: `/radios/${s.slug}`, images: s.logo_url ? [s.logo_url] : undefined },
  };
}

export default async function StationPage({ params }: Props) {
  const s = await getStationBySlug((await params).slug);
  if (!s) notFound();
  const country = s.country as Rel; const category = s.category as Rel;
  const playable = { id: s.id, name: s.name, slug: s.slug, logo_url: s.logo_url, stream_url: s.stream_url, stream_format: s.stream_format, country_name: country?.name };
  const more = country ? (await searchStations({ pais: country.slug, limite: 5 })).items.filter((x) => x.id !== s.id).slice(0, 4) : [];
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'RadioStation', name: s.name, url: absoluteUrl(`/radios/${s.slug}`),
    description: s.short_description ?? s.description ?? undefined, image: s.logo_url ?? undefined, sameAs: s.website_url ? [s.website_url] : undefined,
    areaServed: country?.name, inLanguage: s.language,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="border-b border-line bg-white">
        <div className="wrap py-8 sm:py-12">
          <nav aria-label="Ruta" className="text-sm text-ink/70"><Link href="/radios" className="font-semibold text-sky hover:underline">Radios</Link>{country && <> / <Link href={`/paises/${country.slug}`} className="hover:underline">{country.name}</Link></>}</nav>
          <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
            <StationLogo name={s.name} src={s.logo_url} className="h-28 w-28 text-3xl" />
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl sm:text-5xl">{s.name}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink/75">
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden />{s.city ? `${s.city}, ` : ''}{country?.name}</span>
                {category && <Link href={`/categorias/${category.slug}`} className="hover:underline">{category.name}</Link>}
                {s.verification_status === 'verified' && <span className="badge">Enlace verificado por Radio Eterna</span>}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <PlayButton station={playable} size="lg" label /><FavoriteButton station={playable} />
                {s.website_url && <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">Sitio oficial<ExternalLink className="h-4 w-4" aria-hidden /></a>}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="wrap grid gap-12 py-10">
        {(s.description || s.short_description) && <section aria-labelledby="acerca"><h2 id="acerca" className="mb-3 text-2xl">Acerca de esta radio</h2><p className="prose-es whitespace-pre-line">{s.description ?? s.short_description}</p></section>}
        <p className="max-w-[68ch] text-sm text-ink/65">El audio es transmitido por la propia radio o su proveedor; Radio Eterna no lo aloja ni lo retransmite. Si eres responsable de esta radio y quieres corregir o retirar esta ficha, escríbenos desde la página de contacto.</p>
        {more.length > 0 && <section aria-labelledby="mas"><div id="mas"><SectionHeading title={`Más radios de ${country?.name}`} href={`/paises/${country?.slug}`} /></div><StationList items={more} /></section>}
      </div>
    </>
  );
}

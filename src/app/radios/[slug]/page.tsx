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
import { isWebsiteVerificationCurrent } from '@/lib/security/website-verification';
import { serializeJsonLd } from '@/lib/seo/directory';

type Props = { params: Promise<{ slug: string }> };
type Rel = { name: string; slug: string } | null;
type SocialPlatform = 'facebook' | 'instagram' | 'youtube' | 'x';
const SOCIAL_PLATFORMS: { key: SocialPlatform; label: string }[] = [
  { key: 'facebook', label: 'Facebook' }, { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' }, { key: 'x', label: 'X' },
];

function asRel(value: unknown): Rel {
  const item = Array.isArray(value) ? value[0] : value;
  if (!item || typeof item !== 'object') return null;
  const relation = item as Record<string, unknown>;
  return typeof relation.name === 'string' && typeof relation.slug === 'string'
    ? { name: relation.name, slug: relation.slug } : null;
}

// Treat database JSON as untrusted: only render known platforms and HTTP(S) links.
function getSocialLinks(value: unknown): { key: SocialPlatform; label: string; url: string }[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  const links = value as Record<string, unknown>;
  return SOCIAL_PLATFORMS.flatMap(({ key, label }) => {
    const raw = links[key];
    if (typeof raw !== 'string' || raw.length > 2048) return [];
    try {
      const url = new URL(raw);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return [];
      return [{ key, label, url: url.toString() }];
    } catch { return []; }
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await getStationBySlug((await params).slug);
  if (!s) return { title: 'Radio no encontrada', robots: { index: false } };
  const country = asRel(s.country)?.name;
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
  const country = asRel(s.country);
  const category = asRel(s.category);
  const websiteIsCurrent = isWebsiteVerificationCurrent(s.website_is_secure, s.website_verified_at);
  const socialLinks = getSocialLinks(s.social_links);
  const officialWebsite = s.website_url && websiteIsCurrent ? s.website_url : null;
  const playable = { id: s.id, name: s.name, slug: s.slug, logo_url: s.logo_url, stream_url: s.stream_url, stream_format: s.stream_format, country_name: country?.name };

  const [countryResult, categoryResult] = await Promise.all([
    country ? searchStations({ pais: country.slug, limite: 8 }) : Promise.resolve({ items: [] }),
    category ? searchStations({ categoria: category.slug, limite: 8 }) : Promise.resolve({ items: [] }),
  ]);
  const relatedByCategory = categoryResult.items.filter((item) => item.id !== s.id).slice(0, 4);
  const relatedIds = new Set([s.id, ...relatedByCategory.map((item) => item.id)]);
  const relatedByCountry = countryResult.items.filter((item) => !relatedIds.has(item.id)).slice(0, 4);

  const sameAs = [...(officialWebsite ? [officialWebsite] : []), ...socialLinks.map((link) => link.url)];
  const stationJsonLd = {
    '@context': 'https://schema.org', '@type': 'RadioStation', name: s.name,
    url: absoluteUrl(`/radios/${s.slug}`), mainEntityOfPage: absoluteUrl(`/radios/${s.slug}`),
    description: s.short_description ?? s.description ?? undefined, image: s.logo_url ?? undefined,
    sameAs: sameAs.length ? sameAs : undefined,
    address: country || s.city ? { '@type': 'PostalAddress', addressLocality: s.city ?? undefined, addressCountry: country?.name } : undefined,
    genre: category?.name, inLanguage: s.language,
  };
  const breadcrumbItems = [
    { name: 'Radios', path: '/radios' },
    ...(country ? [{ name: country.name, path: `/paises/${country.slug}` }] : []),
    ...(category ? [{ name: category.name, path: `/categorias/${category.slug}` }] : []),
    { name: s.name, path: `/radios/${s.slug}` },
  ];
  const breadcrumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name, item: absoluteUrl(item.path),
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(stationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }} />
      <div className="border-b border-line bg-white">
        <div className="wrap py-8 sm:py-12">
          <nav aria-label="Ruta" className="text-sm text-ink/70">
            <Link href="/radios" className="font-semibold text-sky hover:underline">Radios</Link>
            {country && <> / <Link href={`/paises/${country.slug}`} className="hover:underline">{country.name}</Link></>}
            {category && <> / <Link href={`/categorias/${category.slug}`} className="hover:underline">{category.name}</Link></>}
          </nav>
          <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
            <StationLogo name={s.name} src={s.logo_url} className="h-28 w-28 text-3xl" />
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl sm:text-5xl">{s.name}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-ink/75">
                {(s.city || country) && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden />{[s.city, country?.name].filter(Boolean).join(', ')}</span>}
                {category && <Link href={`/categorias/${category.slug}`} className="hover:underline">{category.name}</Link>}
                {s.verification_status === 'verified' && <span className="badge">Enlace verificado por Radio Eterna</span>}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <PlayButton station={playable} size="lg" label /><FavoriteButton station={playable} />
                {officialWebsite && <a href={officialWebsite} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">Sitio oficial<ExternalLink className="h-4 w-4" aria-hidden /></a>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap grid gap-10 py-10">
        {(s.description || s.short_description) && (
          <section aria-labelledby="acerca">
            <h2 id="acerca" className="mb-3 text-2xl">Acerca de {s.name}</h2>
            {s.short_description && s.description && <p className="mb-3 max-w-[68ch] font-medium text-ink/80">{s.short_description}</p>}
            <p className="prose-es max-w-[75ch] whitespace-pre-line">{s.description ?? s.short_description}</p>
          </section>
        )}

        {socialLinks.length > 0 && (
          <section aria-labelledby="enlaces">
            <h2 id="enlaces" className="mb-3 text-2xl">Redes sociales</h2>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((link) => <a key={link.key} href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-ghost">{link.label}<ExternalLink className="h-4 w-4" aria-hidden /></a>)}
            </div>
          </section>
        )}

        {(country || category || s.city || s.language) && (
          <section aria-labelledby="datos">
            <h2 id="datos" className="mb-3 text-2xl">Información de la emisora</h2>
            <dl className="grid max-w-3xl gap-4 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2">
              {country && <div><dt className="text-sm text-ink/60">País</dt><dd className="mt-1 font-semibold"><Link className="text-sky hover:underline" href={`/paises/${country.slug}`}>{country.name}</Link></dd></div>}
              {s.city && <div><dt className="text-sm text-ink/60">Ciudad</dt><dd className="mt-1 font-semibold">{s.city}</dd></div>}
              {category && <div><dt className="text-sm text-ink/60">Categoría</dt><dd className="mt-1 font-semibold"><Link className="text-sky hover:underline" href={`/categorias/${category.slug}`}>{category.name}</Link></dd></div>}
              {s.language && <div><dt className="text-sm text-ink/60">Idioma</dt><dd className="mt-1 font-semibold">{s.language.toUpperCase()}</dd></div>}
            </dl>
          </section>
        )}

        {relatedByCategory.length > 0 && <section aria-labelledby="similares"><div id="similares"><SectionHeading title={`Más radios de ${category?.name}`} href={`/categorias/${category?.slug}`} /></div><StationList items={relatedByCategory} /></section>}
        {relatedByCountry.length > 0 && <section aria-labelledby="pais"><div id="pais"><SectionHeading title={`Otras radios de ${country?.name}`} href={`/paises/${country?.slug}`} /></div><StationList items={relatedByCountry} /></section>}

        <p className="max-w-[68ch] text-sm text-ink/65">El audio es transmitido por la propia radio o su proveedor; Radio Eterna no lo aloja ni lo retransmite. Si eres responsable de esta radio y quieres corregir o retirar esta ficha, escríbenos desde la página de contacto.</p>
      </div>
    </>
  );
}

import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';
import { createClient } from '@/lib/supabase/server';
import { getCounts } from '@/lib/data/stations';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const [{ data: stations }, counts] = await Promise.all([
    supabase.from('stations').select('slug, updated_at').eq('status', 'published').is('deleted_at', null).order('published_at', { ascending: false }).limit(5000),
    getCounts(),
  ]);
  // Only list country/category pages that actually have stations (no thin pages in the index).
  const withStations = (m: Record<string, number>, base: string) => Object.entries(m).filter(([, n]) => n > 0).map(([slug]) => ({ url: absoluteUrl(`${base}/${slug}`) }));
  return [
    { url: absoluteUrl('/') }, { url: absoluteUrl('/radios') }, { url: absoluteUrl('/paises') }, { url: absoluteUrl('/categorias') },
    { url: absoluteUrl('/sumar-radio') }, { url: absoluteUrl('/contacto') }, { url: absoluteUrl('/privacidad') }, { url: absoluteUrl('/terminos') },
    ...withStations(counts.countries, '/paises'), ...withStations(counts.categories, '/categorias'),
    ...(stations ?? []).map((s) => ({ url: absoluteUrl(`/radios/${s.slug}`), lastModified: s.updated_at })),
  ];
}

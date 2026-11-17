import { createClient } from '@/lib/supabase/server';
import type { Category, Country, Paginated, StationCard } from '@/types';

export type StationQuery = { q?: string; pais?: string; categoria?: string; pagina?: number; orden?: 'name' | 'recent'; destacadas?: boolean; limite?: number };

export async function searchStations(p: StationQuery = {}): Promise<Paginated<StationCard>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('search_stations', {
    p_query: p.q ?? null, p_country: p.pais ?? null, p_category: p.categoria ?? null,
    p_featured: p.destacadas ?? null, p_page: p.pagina ?? 1, p_page_size: p.limite ?? 24, p_sort: p.orden ?? 'name',
  });
  if (error) throw new Error(`searchStations: ${error.message}`);
  return data as Paginated<StationCard>;
}

const STATION_DETAIL_BASE_COLUMNS =
  'id,content_type,name,slug,short_description,description,country_id,city,primary_category_id,language,stream_url,stream_format,logo_url,website_url,social_links,verification_status,is_featured,published_at,country:countries(name,slug),category:categories!primary_category_id(name,slug)';

function isMissingWebsiteSecurityColumn(error: { code?: string; message?: string }): boolean {
  if (error.code === '42703' || error.code === 'PGRST204') return true;
  return /website_is_secure/i.test(error.message) && /(column|schema cache|does not exist|could not find)/i.test(error.message);
}

export async function getStationBySlug(slug: string) {
  const supabase = await createClient();
  // The public detail page must remain readable even if migration 0007 has not
  // reached the database yet. In that case, fail closed for external websites.
  const current = await supabase.from('stations')
    .select(`id,content_type,name,slug,short_description,description,country_id,city,primary_category_id,language,stream_url,stream_format,logo_url,website_url,website_is_secure,social_links,verification_status,is_featured,published_at,country:countries(name,slug),category:categories!primary_category_id(name,slug)`)
    .eq('slug', slug).eq('status', 'published').is('deleted_at', null).maybeSingle();

  if (!current.error) return current.data;
  if (!isMissingWebsiteSecurityColumn(current.error)) {
    throw new Error(`getStationBySlug: ${current.error.message}`);
  }

  console.warn('[stations] website_is_secure column is missing; loading station without its external website link until migration 0007 is applied.');
  const legacy = await supabase.from('stations')
    .select(STATION_DETAIL_BASE_COLUMNS)
    .eq('slug', slug).eq('status', 'published').is('deleted_at', null).maybeSingle();
  if (legacy.error) throw new Error(`getStationBySlug: ${legacy.error.message}`);
  return legacy.data ? { ...legacy.data, website_is_secure: false } : null;
}

export async function listCountries(): Promise<Country[]> {
  const { data, error } = await (await createClient()).from('countries').select('id,code,name,slug').eq('is_active', true).order('display_order');
  if (error) throw new Error(error.message); return data ?? [];
}
export async function listCategories(): Promise<Category[]> {
  const { data, error } = await (await createClient()).from('categories').select('id,name,slug,description').eq('is_active', true).order('display_order');
  if (error) throw new Error(error.message); return data ?? [];
}

export async function getCounts(): Promise<{ countries: Record<string, number>; categories: Record<string, number> }> {
  const supabase = await createClient();
  const [c, k] = await Promise.all([supabase.rpc('country_station_counts'), supabase.rpc('category_station_counts')]);
  if (c.error) throw new Error(c.error.message);
  if (k.error) throw new Error(k.error.message);
  const toMap = (rows: { slug: string; station_count: number }[] | null) => Object.fromEntries((rows ?? []).map((r) => [r.slug, Number(r.station_count)]));
  return { countries: toMap(c.data), categories: toMap(k.data) };
}

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

export async function getStationBySlug(slug: string) {
  const supabase = await createClient();
  // Keep this projection explicit: anonymous clients must never fetch internal verification data.
  const { data, error } = await supabase.from('stations')
    .select('id,content_type,name,slug,short_description,description,country_id,city,primary_category_id,language,stream_url,stream_format,logo_url,website_url,social_links,verification_status,is_featured,published_at,country:countries(name,slug),category:categories!primary_category_id(name,slug)')
    .eq('slug', slug).eq('status', 'published').is('deleted_at', null).maybeSingle();
  if (error) throw new Error(`getStationBySlug: ${error.message}`);
  return data;
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

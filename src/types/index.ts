export type StationCard = {
  id: string; name: string; slug: string; short_description: string | null; city: string | null;
  logo_url: string | null; stream_url: string; stream_format: 'mp3' | 'aac' | 'ogg' | 'hls' | 'unknown' | null;
  is_featured: boolean; verification_status: 'unverified' | 'verified' | 'failed' | 'manual';
  published_at: string | null; country_name: string; country_slug: string; category_name: string; category_slug: string;
};
export type Paginated<T> = { items: T[]; total: number; page: number; page_size: number };
export type Country = { id: string; code: string; name: string; slug: string };
export type Category = { id: string; name: string; slug: string; description: string | null };

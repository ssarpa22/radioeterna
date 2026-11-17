import { createClient } from '@/lib/supabase/server';

/** Public site settings (RLS exposes only rows with is_public = true). Empty strings are treated as "not configured". */
export async function getPublicSettings() {
  const { data } = await (await createClient()).from('site_settings').select('key, value').eq('is_public', true);
  const v = Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Record<string, unknown>;
  const str = (k: string) => (typeof v[k] === 'string' && (v[k] as string).trim() !== '' ? (v[k] as string).trim() : null);
  return { contactEmail: str('contact_email'), platformName: str('platform_name') ?? 'Radio Eterna' };
}

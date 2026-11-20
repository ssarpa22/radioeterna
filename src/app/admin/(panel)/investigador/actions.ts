'use server';
import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function applySuggestion(
  admin: ReturnType<typeof createAdminClient>,
  user: Awaited<ReturnType<typeof createClient>>,
  id: string,
) {
  const { data: item, error } = await admin
    .from('station_website_suggestions')
    .select('id,station_id,suggestions')
    .eq('id', id)
    .eq('status', 'pending')
    .maybeSingle();
  if (error || !item) return false;

  const { data: station } = await admin
    .from('stations')
    .select('description,logo_url,social_links')
    .eq('id', item.station_id)
    .maybeSingle();
  if (!station) return false;

  const suggested = item.suggestions as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (!station.description && typeof suggested.description === 'string') patch.description = suggested.description;
  if (!station.logo_url && typeof suggested.logo_url === 'string') patch.logo_url = suggested.logo_url;

  const oldSocial = (station.social_links ?? {}) as Record<string, unknown>;
  const incoming = (suggested.social_links ?? {}) as Record<string, unknown>;
  const merged = { ...oldSocial };
  for (const key of ['facebook', 'instagram', 'youtube', 'x']) {
    if (!merged[key] && typeof incoming[key] === 'string') merged[key] = incoming[key];
  }
  if (Object.keys(merged).length) patch.social_links = merged;

  // HTML lang often describes the website template, not the station's broadcast language.
  // Never bulk-apply language, station name, stream URLs or contact emails.
  if (Object.keys(patch).length) {
    const { error: updateError } = await user.from('stations').update(patch).eq('id', item.station_id);
    if (updateError) return false;
  }

  const { error: reviewError } = await admin
    .from('station_website_suggestions')
    .update({ status: 'applied', reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending');
  return !reviewError;
}

export async function applyWebsiteSuggestion(id: string) {
  await requireStaff();
  const admin = createAdminClient();
  const user = await createClient();
  await applySuggestion(admin, user, id);
  revalidatePath('/admin/investigador');
  revalidatePath('/admin/radios');
  revalidatePath('/');
}

export async function applyAllWebsiteSuggestions() {
  await requireStaff();
  const admin = createAdminClient();
  const user = await createClient();
  let cursor = '';
  let applied = 0;

  // Cursor pagination stays stable as suggestion statuses change.
  while (true) {
    let query = admin
      .from('station_website_suggestions')
      .select('id')
      .eq('status', 'pending')
      .order('id')
      .limit(100);
    if (cursor) query = query.gt('id', cursor);
    const { data, error } = await query;
    if (error || !data?.length) break;

    for (const row of data) {
      if (await applySuggestion(admin, user, row.id)) applied++;
    }
    cursor = data[data.length - 1]!.id;
    if (data.length < 100) break;
  }

  revalidatePath('/admin/investigador');
  revalidatePath('/admin/radios');
  revalidatePath('/');
  return { applied };
}

export async function dismissWebsiteSuggestion(id: string) {
  await requireStaff();
  const admin = createAdminClient();
  await admin
    .from('station_website_suggestions')
    .update({ status: 'dismissed', reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending');
  revalidatePath('/admin/investigador');
}

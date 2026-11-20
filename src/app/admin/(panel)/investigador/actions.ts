'use server';
import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function applyWebsiteSuggestion(id:string) {
  await requireStaff();
  const supabase=createAdminClient();
  const {data:item,error}=await supabase.from('station_website_suggestions').select('id,station_id,suggestions').eq('id',id).eq('status','pending').maybeSingle();
  if(error||!item) return;
  const {data:station}=await supabase.from('stations').select('name,description,logo_url,language,social_links').eq('id',item.station_id).maybeSingle();
  if(!station)return;
  const suggested=item.suggestions as Record<string,unknown>;
  const patch:Record<string,unknown>={};
  if(!station.description && typeof suggested.description==='string')patch.description=suggested.description;
  if(!station.logo_url && typeof suggested.logo_url==='string')patch.logo_url=suggested.logo_url;
  if((!station.language || station.language==='es') && typeof suggested.language==='string')patch.language=suggested.language;
  const oldSocial=(station.social_links??{}) as Record<string,unknown>;
  const incoming=(suggested.social_links??{}) as Record<string,unknown>;
  const merged={...oldSocial};
  for(const key of ['facebook','instagram','youtube','x']) if(!merged[key] && typeof incoming[key]==='string')merged[key]=incoming[key];
  if(Object.keys(merged).length)patch.social_links=merged;
  // A page title is not reliable enough to rename a station automatically.
  const userClient=await createClient();
  const {error:updateError}=await userClient.from('stations').update(patch).eq('id',item.station_id);
  if(updateError)return;
  await supabase.from('station_website_suggestions').update({status:'applied',reviewed_at:new Date().toISOString()}).eq('id',id).eq('status','pending');
  revalidatePath('/admin/investigador');revalidatePath('/admin/radios');revalidatePath('/');
}

export async function dismissWebsiteSuggestion(id:string) {
  await requireStaff();
  const supabase=createAdminClient();
  await supabase.from('station_website_suggestions').update({status:'dismissed',reviewed_at:new Date().toISOString()}).eq('id',id).eq('status','pending');
  revalidatePath('/admin/investigador');
}

import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui';
import { StationForm } from '@/components/admin/StationForm';

export const metadata: Metadata = { title: 'Nueva radio' };
export default async function NewStation() {
  await requireStaff(); const supabase = await createClient();
  const [c, k] = await Promise.all([supabase.from('countries').select('id,code,name,slug').eq('is_active', true).order('name'), supabase.from('categories').select('id,name,slug,description').eq('is_active', true).order('display_order')]);
  return (<><PageHeader title="Nueva radio" intro="Se crea como borrador. Debes verificar el enlace antes de publicarla." crumb={{ href: '/admin/radios', label: 'Radios' }} />
    <div className="wrap max-w-3xl py-8"><StationForm countries={c.data ?? []} categories={k.data ?? []} /></div></>);
}

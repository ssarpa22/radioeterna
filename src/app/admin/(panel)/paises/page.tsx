import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui';
import { RefAdmin } from '@/components/admin/RefAdmin';
import { saveCountry } from '../../actions';

export const metadata: Metadata = { title: 'Países' };
export default async function Countries() {
  await requireStaff('admin'); const { data } = await (await createClient()).from('countries').select('*').order('display_order');
  return (<><PageHeader title="Países" intro="Los países inactivos se ocultan del sitio." /><div className="wrap max-w-3xl py-8"><RefAdmin kind="country" action={saveCountry} rows={data ?? []} /></div></>);
}

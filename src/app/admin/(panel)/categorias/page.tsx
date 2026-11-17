import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui';
import { RefAdmin } from '@/components/admin/RefAdmin';
import { saveCategory } from '../../actions';

export const metadata: Metadata = { title: 'Categorías' };
export default async function Categories() {
  await requireStaff('admin'); const { data } = await (await createClient()).from('categories').select('*').order('display_order');
  return (<><PageHeader title="Categorías" intro="Las categorías inactivas se ocultan del sitio; no se pueden borrar si tienen radios." /><div className="wrap max-w-3xl py-8"><RefAdmin kind="category" action={saveCategory} rows={data ?? []} /></div></>);
}

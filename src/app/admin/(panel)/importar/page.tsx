import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui';
import { RadioImporter } from '@/components/admin/RadioImporter';

export const metadata: Metadata = { title: 'Importar emisoras' };

export default async function ImportStationsPage() {
  const staff = await requireStaff('admin');
  if (staff.role !== 'super_admin') redirect('/admin?acceso=denegado');
  const supabase = await createClient();
  const { data, error } = await supabase.from('countries').select('id,code,name').eq('is_active', true).order('display_order');
  return (
    <>
      <PageHeader title="Importar emisoras" crumb={{ href: '/admin/radios', label: 'Radios' }} intro="Buscá emisoras cristianas en Radio Browser y elegí cuáles querés incorporar al catálogo." />
      <div className="wrap grid gap-6 py-8">
        <div className="rounded-xl border border-line bg-gold-soft/40 p-4 text-sm">
          <strong>Importación segura:</strong> cada stream se vuelve a verificar antes de guardarse. Las emisoras importadas quedan como borradores; no aparecen en la página pública hasta que las revises y publiques.
        </div>
        {error ? <p role="alert" className="text-danger">No se pudieron cargar los países.</p> : <RadioImporter countries={data ?? []} />}
      </div>
    </>
  );
}

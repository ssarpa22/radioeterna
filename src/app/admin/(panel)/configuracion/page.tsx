import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ActionForm, Field } from '@/components/forms/ActionForm';
import { PageHeader } from '@/components/ui';
import { saveSettings } from '../../actions';

export const metadata: Metadata = { title: 'Configuración' };
export default async function Settings() {
  await requireStaff('admin'); const { data } = await (await createClient()).from('site_settings').select('key, value');
  const v = Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const social = (v.social_links ?? {}) as Record<string, string>;
  return (
    <>
      <PageHeader title="Configuración" intro="Estos datos se guardan en la base de datos. Conectarlos al encabezado y pie del sitio público queda para la Fase 4." />
      <div className="wrap max-w-2xl py-8">
        <ActionForm action={saveSettings} submit="Guardar configuración">
          <Field name="platform_name" label="Nombre de la plataforma" required defaultValue={v.platform_name} />
          <Field name="platform_description" label="Descripción" kind="textarea" rows={3} defaultValue={v.platform_description} maxLength={300} />
          <Field name="contact_email" label="Correo de contacto" type="email" defaultValue={v.contact_email} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="facebook" label="Facebook" type="url" defaultValue={social.facebook} /><Field name="instagram" label="Instagram" type="url" defaultValue={social.instagram} />
            <Field name="youtube" label="YouTube" type="url" defaultValue={social.youtube} /><Field name="x" label="X" type="url" defaultValue={social.x} />
          </div>
        </ActionForm>
      </div>
    </>
  );
}

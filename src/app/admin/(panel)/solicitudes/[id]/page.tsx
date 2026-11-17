import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SUBMISSION_LABEL, fmtDate } from '@/lib/labels';
import { ActionForm, Field } from '@/components/forms/ActionForm';
import { PageHeader } from '@/components/ui';
import { SubmissionCommands } from '@/components/admin/SubmissionCommands';
import { saveSubmission } from '@/app/admin/actions';

export const metadata: Metadata = { title: 'Solicitud' };
export default async function SubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff(); const { id } = await params; const supabase = await createClient();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: s } = await supabase.from('station_submissions').select('*').eq('id', id).maybeSingle();
  if (!s) notFound();
  const [c, k] = await Promise.all([supabase.from('countries').select('id,name').order('name'), supabase.from('categories').select('id,name').order('display_order')]);
  const pending = s.status === 'pending';
  return (
    <>
      <PageHeader title={s.station_name} crumb={{ href: '/admin/solicitudes', label: 'Solicitudes' }} intro={<><span className="badge mr-2">{SUBMISSION_LABEL[s.status]}</span>Recibida el {fmtDate(s.created_at)}</>} />
      <div className="wrap grid gap-10 py-8 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="datos"><h2 id="datos" className="mb-3 text-xl">Información enviada</h2>
          {pending ? (
            <ActionForm action={saveSubmission} submit="Guardar cambios y notas">
              <input type="hidden" name="id" value={s.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="station_name" label="Nombre" required defaultValue={s.station_name} /><Field name="city" label="Ciudad" required defaultValue={s.city} />
                <Field name="country_id" label="País" kind="select" required defaultValue={s.country_id} options={(c.data ?? []).map((x) => ({ value: x.id, label: x.name }))} />
                <Field name="primary_category_id" label="Categoría" kind="select" required defaultValue={s.primary_category_id} options={(k.data ?? []).map((x) => ({ value: x.id, label: x.name }))} />
                <Field name="website_url" label="Sitio web" type="url" required defaultValue={s.website_url} /><Field name="stream_url" label="Enlace de transmisión" type="url" required defaultValue={s.stream_url} />
              </div>
              <Field name="description" label="Descripción" kind="textarea" required defaultValue={s.description} /><Field name="logo_url" label="Logo (enlace)" type="url" defaultValue={s.logo_url} />
              <Field name="internal_notes" label="Notas internas" kind="textarea" rows={3} defaultValue={s.internal_notes} hint="Solo las ve el equipo." />
            </ActionForm>
          ) : (
            <div className="grid gap-2 text-ink/80"><p>Estado: {SUBMISSION_LABEL[s.status]} el {fmtDate(s.reviewed_at)}.</p>{s.internal_notes && <p>Notas: {s.internal_notes}</p>}
              {s.station_id && <Link href={`/admin/radios/${s.station_id}`} className="btn btn-ghost w-fit">Ver la radio creada</Link>}</div>)}
        </section>
        <aside className="grid content-start gap-8">
          <section aria-labelledby="contacto"><h2 id="contacto" className="mb-3 text-xl">Contacto</h2>
            <p>{s.contact_name}</p><p><a href={`mailto:${s.contact_email}`} className="text-sky hover:underline">{s.contact_email}</a></p>
            <p className="mt-2 text-sm text-ink/60">El solicitante confirmó estar autorizado a representar a la radio.</p></section>
          {pending && <section aria-labelledby="revision"><h2 id="revision" className="mb-3 text-xl">Revisión</h2><SubmissionCommands id={s.id} />
            <p className="mt-3 text-sm text-ink/60">Aprobar crea una radio en borrador, sin verificar. Publicarla es un paso aparte.</p></section>}
        </aside>
      </div>
    </>
  );
}

import { ActionForm, Field } from '@/components/forms/ActionForm';
import { saveStation } from '@/app/admin/actions';
import type { Category, Country } from '@/types';

type S = Record<string, any> | null; // eslint-disable-line @typescript-eslint/no-explicit-any
export function StationForm({ station, countries, categories, extraIds = [] }: { station?: S; countries: Country[]; categories: Category[]; extraIds?: string[] }) {
  const s = station ?? {}; const social = (s.social_links ?? {}) as Record<string, string>;
  return (
    <ActionForm action={saveStation} submit={station ? 'Guardar cambios' : 'Crear radio'}>
      {station && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Nombre" required defaultValue={s.name} maxLength={120} />
        <Field name="slug" label="Enlace en el sitio (slug)" defaultValue={s.slug} hint="Déjalo vacío para generarlo desde el nombre." />
        <Field name="country_id" label="País" kind="select" required defaultValue={s.country_id} options={countries.map((c) => ({ value: c.id, label: c.name }))} />
        <Field name="city" label="Ciudad" defaultValue={s.city} maxLength={80} />
        <Field name="primary_category_id" label="Categoría principal" kind="select" required defaultValue={s.primary_category_id} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
        <Field name="language" label="Idioma" defaultValue={s.language ?? 'es'} maxLength={8} />
      </div>
      <fieldset><legend className="label">Categorías adicionales</legend>
        <div className="grid gap-2 sm:grid-cols-2">{categories.map((c) => (
          <label key={c.id} className="flex min-h-[40px] items-center gap-2 text-[15px]"><input type="checkbox" name="categories" value={c.id} defaultChecked={extraIds.includes(c.id)} className="h-5 w-5 accent-[#12284B]" />{c.name}</label>))}</div></fieldset>
      <Field name="short_description" label="Descripción corta" defaultValue={s.short_description} maxLength={200} />
      <Field name="description" label="Descripción completa" kind="textarea" rows={6} defaultValue={s.description} maxLength={5000} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="stream_url" label="Enlace de transmisión (stream)" type="url" required defaultValue={s.stream_url} hint="Si lo cambias, la radio vuelve a «sin verificar»." />
        <Field name="stream_format" label="Formato" kind="select" emptyLabel="Automático" defaultValue={s.stream_format} options={['mp3', 'aac', 'ogg', 'hls', 'unknown'].map((v) => ({ value: v, label: v === 'unknown' ? 'Desconocido' : v.toUpperCase() }))} />
        <Field name="logo_url" label="Enlace del logo" type="url" defaultValue={s.logo_url} hint="Usa solo logos con autorización." />
        <Field name="website_url" label="Sitio web oficial" type="url" defaultValue={s.website_url} />
        <Field name="facebook" label="Facebook" type="url" defaultValue={social.facebook} /><Field name="instagram" label="Instagram" type="url" defaultValue={social.instagram} />
        <Field name="youtube" label="YouTube" type="url" defaultValue={social.youtube} /><Field name="x" label="X" type="url" defaultValue={social.x} />
        <Field name="display_order" label="Orden de aparición" type="number" defaultValue={s.display_order ?? 0} />
      </div>
    </ActionForm>
  );
}

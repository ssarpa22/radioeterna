import { ActionForm, Field } from '@/components/forms/ActionForm';
import type { FormState } from '@/lib/form';

type Action = (p: FormState, fd: FormData) => Promise<FormState>;
type Row = { id: string; name: string; slug: string; display_order: number; is_active: boolean; code?: string; description?: string | null };

/** One reusable admin list for countries and categories: create form + one editable form per row. */
export function RefAdmin({ rows, action, kind }: { rows: Row[]; action: Action; kind: 'country' | 'category' }) {
  const fields = (r?: Row) => (<>
    {r && <input type="hidden" name="id" value={r.id} />}
    {kind === 'country' && <Field name="code" label="Código (2 letras)" required defaultValue={r?.code} maxLength={2} />}
    <Field name="name" label="Nombre" required defaultValue={r?.name} maxLength={80} />
    <Field name="slug" label="Slug" defaultValue={r?.slug} hint={r ? undefined : 'Opcional.'} />
    {kind === 'category' && <Field name="description" label="Descripción" defaultValue={r?.description} maxLength={500} />}
    <Field name="display_order" label="Orden" type="number" defaultValue={r?.display_order ?? 0} />
    <Field name="is_active" kind="checkbox" label="Activo (visible en el sitio)" defaultValue={r ? r.is_active : true} />
  </>);
  return (
    <div className="grid gap-8">
      <details className="rounded-2xl border border-line bg-white p-4"><summary className="cursor-pointer font-semibold">{kind === 'country' ? 'Agregar país' : 'Agregar categoría'}</summary>
        <div className="mt-4"><ActionForm action={action} submit="Crear" className="grid gap-3 sm:grid-cols-2">{fields()}</ActionForm></div></details>
      <ul className="grid gap-3">{rows.map((r) => (
        <li key={r.id} className="rounded-2xl border border-line bg-white p-4"><ActionForm action={action} className="grid gap-3 sm:grid-cols-2">{fields(r)}</ActionForm></li>))}</ul>
    </div>
  );
}

'use client';
import { createContext, useActionState, useContext, type ReactNode } from 'react';
import type { FormState } from '@/lib/form';

const Ctx = createContext<FormState>({ ok: null });
type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

/** Server-action form with pending state, field errors and a status message. Reused by the public form and every admin form. */
export function ActionForm({ action, children, submit = 'Guardar', pendingLabel = 'Guardando…', className = 'grid gap-4', successView }:
  { action: Action; children: ReactNode; submit?: string; pendingLabel?: string; className?: string; successView?: ReactNode }) {
  const [state, formAction, pending] = useActionState(action, { ok: null } as FormState);
  if (state.ok && successView) return <>{successView}</>;
  return (
    <Ctx.Provider value={state}>
      <form action={formAction} className={className} noValidate aria-busy={pending}>
        {children}
        <div aria-live="polite">{state.message && <p role={state.ok ? 'status' : 'alert'} className={`rounded-xl px-4 py-3 text-sm ${state.ok ? 'bg-[#E6F2EC] text-ok' : 'bg-[#F8E5E3] text-danger'}`}>{state.message}</p>}</div>
        <div><button type="submit" disabled={pending} className="btn btn-dark">{pending ? pendingLabel : submit}</button></div>
      </form>
    </Ctx.Provider>
  );
}

type Opt = { value: string; label: string };
type FieldProps = { name: string; label: string; kind?: 'input' | 'textarea' | 'select' | 'checkbox'; type?: string; defaultValue?: string | number | boolean | null;
  hint?: string; required?: boolean; options?: Opt[]; rows?: number; placeholder?: string; maxLength?: number; emptyLabel?: string };

export function Field({ name, label, kind = 'input', type = 'text', defaultValue, hint, required, options, rows = 4, placeholder, maxLength, emptyLabel }: FieldProps) {
  const st = useContext(Ctx);
  const errs = st.errors?.[name]; const id = `f-${name}`;
  const val = st.values?.[name] ?? (defaultValue == null ? '' : String(defaultValue));
  const common = { id, name, 'aria-invalid': errs ? true : undefined, 'aria-describedby': errs ? `${id}-err` : hint ? `${id}-hint` : undefined, required };
  const error = errs && <p id={`${id}-err`} className="mt-1.5 text-sm text-danger">{errs[0]}</p>;
  if (kind === 'checkbox') {
    const checked = st.values ? st.values[name] === 'on' : Boolean(defaultValue);
    return (<div><label className="flex items-start gap-3 text-[15px]"><input type="checkbox" {...common} defaultChecked={checked} className="mt-1 h-5 w-5 accent-[#12284B]" /><span>{label}</span></label>{error}</div>);
  }
  return (
    <div>
      <label htmlFor={id} className="label">{label}{required && <span aria-hidden className="text-danger"> *</span>}</label>
      {kind === 'textarea' ? <textarea {...common} defaultValue={val} rows={rows} maxLength={maxLength} className="field py-2.5" />
        : kind === 'select' ? <select {...common} defaultValue={val} className="field"><option value="">{emptyLabel ?? 'Selecciona…'}</option>{options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        : <input {...common} type={type} defaultValue={val} placeholder={placeholder} maxLength={maxLength} className="field" />}
      {hint && !errs && <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink/60">{hint}</p>}
      {error}
    </div>
  );
}

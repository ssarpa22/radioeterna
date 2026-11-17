import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import { listCategories, listCountries } from '@/lib/data/stations';
import { ActionForm, Field } from '@/components/forms/ActionForm';
import { PageHeader } from '@/components/ui';
import { submitStation } from './actions';

export const metadata: Metadata = { title: 'Suma tu radio', description: 'Solicita que tu radio cristiana o evangélica aparezca en Radio Eterna.', alternates: { canonical: '/sumar-radio' } };

export default async function SubmitPage() {
  const [countries, categories] = await Promise.all([listCountries(), listCategories()]);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileReady = Boolean(siteKey && process.env.TURNSTILE_SECRET_KEY);
  const production = process.env.NODE_ENV === 'production';
  const done = (
    <div className="wrap py-12"><div className="max-w-xl rounded-2xl border border-line bg-white p-8" role="status">
      <h2 className="text-2xl">Recibimos tu solicitud</h2>
      <p className="mt-3 text-ink/80">Revisaremos la información y el enlace de transmisión antes de publicar tu radio. Esto puede tardar unos días. Te escribiremos al correo que indicaste si necesitamos algo más.</p>
      <Link href="/" className="btn btn-ghost mt-6">Volver al inicio</Link></div></div>
  );
  return (
    <>
      <PageHeader title="Suma tu radio a Radio Eterna" intro="Completa el formulario. Revisamos cada solicitud antes de publicarla; ninguna radio aparece automáticamente." />
      <div className="wrap max-w-3xl py-8">
        {production && !turnstileReady ? (
          <div role="alert" className="rounded-xl border border-line bg-white p-6 text-sm text-ink/80">
            El formulario está temporalmente deshabilitado porque falta configurar la protección antispam. Inténtalo nuevamente más tarde.
          </div>
        ) : (
          <ActionForm action={submitStation} submit="Enviar solicitud" pendingLabel="Enviando…" successView={done}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="station_name" label="Nombre de la radio" required maxLength={120} />
              <Field name="city" label="Ciudad" required maxLength={80} />
              <Field name="country_id" label="País" kind="select" required options={countries.map((c) => ({ value: c.id, label: c.name }))} />
              <Field name="primary_category_id" label="Categoría principal" kind="select" required options={categories.map((c) => ({ value: c.id, label: c.name }))} />
              <Field name="website_url" label="Sitio web oficial" type="url" required placeholder="https://" />
              <Field name="stream_url" label="Enlace de transmisión (stream)" type="url" required placeholder="https://" hint="El enlace directo de audio que te da tu proveedor (Icecast, SHOUTcast, HLS…)." />
            </div>
            <Field name="description" label="Descripción" kind="textarea" required maxLength={2000} hint="Cuéntanos en pocas líneas qué transmite tu radio." />
            <Field name="logo_url" label="Enlace del logo (opcional)" type="url" placeholder="https://" hint="Solo si tienes derecho a usarlo." />
            <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <Field name="contact_name" label="Tu nombre" required maxLength={120} />
              <Field name="contact_email" label="Tu correo electrónico" type="email" required />
            </div>
            <Field name="authorized_confirmed" kind="checkbox" label="Confirmo que estoy autorizado/a para representar a esta radio y solicitar su inclusión, y que la información es correcta." />
            {/* Honeypot: invisible to people, tempting to bots. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>No completar<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            {siteKey && <><div className="cf-turnstile" data-sitekey={siteKey} data-language="es" /><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" /></>}
          </ActionForm>
        )}
      </div>
    </>
  );
}

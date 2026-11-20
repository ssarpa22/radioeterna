import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/ui';
import { applyAllWebsiteSuggestions, applyWebsiteSuggestion, dismissWebsiteSuggestion } from './actions';

export const metadata: Metadata = { title: 'Investigador de emisoras' };

export default async function WebsiteResearch() {
  await requireStaff();
  const supabase=createAdminClient();
  const [{data:pending,error},{data:recent}] = await Promise.all([
    supabase.from('station_website_suggestions').select('*').eq('status','pending').order('scanned_at',{ascending:false}).limit(50),
    supabase.from('station_website_suggestions').select('id,station_name,status,detail,scanned_at').neq('status','pending').order('scanned_at',{ascending:false}).limit(12)
  ]);
  return <>
    <PageHeader title="Investigador de emisoras" intro="Datos detectados en los sitios oficiales. Nada se modifica hasta que lo apruebes." />
    <div className="wrap grid gap-8 py-8">
      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="text-xl font-semibold">Cómo funciona</h2>
        <p className="mt-2 text-sm text-ink/70">El workflow diario analiza dos sitios por ejecución de lote, evita duplicar sugerencias pendientes y registra los resultados. También podés iniciarlo manualmente desde GitHub Actions.</p>
        <p className="mt-2 text-sm text-ink/70">La aprobación completa únicamente descripción, logo y redes sociales que estén vacíos. Nunca reemplaza datos existentes ni modifica el idioma, el nombre o el stream. Emails y posibles streams quedan como referencia para revisión.</p>
        <a className="mt-3 inline-block text-sm font-semibold text-sky hover:underline" href="https://github.com/ssarpa22/radioeterna/actions/workflows/website-enrichment.yml" target="_blank" rel="noreferrer">Ejecutar workflow en GitHub ↗</a>
      </section>
      {error && <p role="alert" className="rounded-xl bg-[#F8E5E3] p-4 text-danger">No se pudieron cargar las sugerencias.</p>}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-semibold">Pendientes de revisión</h2><p className="text-sm text-ink/60">Hasta 50 sugerencias recientes</p></div><div className="flex flex-wrap items-center gap-3"><span className="text-sm font-semibold">{pending?.length??0} pendiente(s) visibles</span>{Boolean(pending?.length) && <form action={applyAllWebsiteSuggestions}><button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90">Aceptar todas las pendientes</button></form>}</div></div>
        {!pending?.length ? <div className="rounded-2xl border border-line bg-white p-6 text-sm text-ink/70">No hay sugerencias pendientes. Ejecutá el workflow para investigar nuevos sitios.</div> :
        <ul className="grid gap-4">{pending.map(item=>{
          const suggestions=item.suggestions as Record<string,unknown>, confidence=item.confidence as Record<string,string>;
          return <li key={item.id} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{item.station_name}</h3><p className="mt-1 break-all text-xs text-ink/60">Origen: {item.final_url??item.source_url}</p></div><time className="text-xs text-ink/60">{new Date(item.scanned_at).toLocaleString('es-AR')}</time></div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(suggestions).map(([key,value])=><div key={key} className="min-w-0 rounded-xl bg-surface p-3"><dt className="text-xs font-semibold uppercase text-ink/60">{key === 'language' ? 'Idioma del HTML · ignorado' : key.replaceAll('_',' ')} · {confidence[key]??'sin nivel'}</dt><dd className="mt-1 break-words text-sm">{typeof value==='object'?JSON.stringify(value):String(value)}</dd></div>)}</dl>
            {item.detail && <p className="mt-3 text-sm text-ink/60">{item.detail}</p>}
            <div className="mt-4 flex flex-wrap gap-3"><form action={applyWebsiteSuggestion.bind(null,item.id)}><button className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90">Aprobar y completar campos vacíos</button></form><form action={dismissWebsiteSuggestion.bind(null,item.id)}><button className="rounded-full border border-line px-4 py-2 text-sm hover:bg-surface">Descartar</button></form><Link href={`/admin/radios/${item.station_id}`} className="self-center text-sm font-semibold text-sky hover:underline">Abrir emisora →</Link></div>
          </li>;
        })}</ul>}
      </section>
      <section><h2 className="mb-3 text-xl font-semibold">Actividad reciente</h2><ul className="divide-y divide-line rounded-2xl border border-line bg-white">{(recent??[]).map(item=><li key={item.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm"><span>{item.station_name} · {item.status==='applied'?'Aplicado':item.status==='dismissed'?'Descartado':'Sin datos'}</span><time className="text-ink/60">{new Date(item.scanned_at).toLocaleDateString('es-AR')}</time></li>)}</ul></section>
    </div>
  </>;
}

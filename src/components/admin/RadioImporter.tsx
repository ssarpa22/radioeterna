'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { importRadioCandidates, searchRadioCandidates, type RadioCandidate } from '@/app/admin/importar/actions';

type CountryOption = { id: string; code: string; name: string };

export function RadioImporter({ countries }: { countries: CountryOption[] }) {
  const [country, setCountry] = useState(countries.find((item) => item.code === 'AR')?.code ?? countries[0]?.code ?? '');
  const [term, setTerm] = useState('radio cristiana');
  const [results, setResults] = useState<RadioCandidate[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [skipped, setSkipped] = useState<{ name: string; reason: string }[]>([]);
  const [imported, setImported] = useState<{ id: string; name: string }[]>([]);
  const [pending, startTransition] = useTransition();

  const search = () => {
    setMessage('');
    setImported([]);
    setSkipped([]);
    startTransition(async () => {
      const response = await searchRadioCandidates(country, term);
      setMessage(response.message);
      setResults(response.ok ? response.data ?? [] : []);
      setSelected([]);
    });
  };

  const toggle = (uuid: string) => {
    setSelected((current) => current.includes(uuid) ? current.filter((id) => id !== uuid) : current.length < 20 ? [...current, uuid] : current);
  };

  const importSelected = () => {
    if (!selected.length) return;
    setMessage('');
    setImported([]);
    setSkipped([]);
    startTransition(async () => {
      const response = await importRadioCandidates(selected);
      setMessage(response.message);
      setImported(response.data?.imported ?? []);
      setSkipped(response.data?.skipped ?? []);
      if (response.ok) setSelected([]);
    });
  };

  return (
    <div className="grid gap-8">
      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm font-semibold" htmlFor="import-country">
            País
            <select id="import-country" value={country} onChange={(event) => setCountry(event.target.value)} className="field">
              {countries.map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold" htmlFor="import-term">
            Buscar por nombre o frase
            <input id="import-term" value={term} onChange={(event) => setTerm(event.target.value)} maxLength={80} className="field" placeholder="Ej. radio cristiana, gospel, adoración" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); search(); } }} />
          </label>
          <button type="button" onClick={search} disabled={pending || !country || term.trim().length < 2} className="btn btn-dark">
            {pending ? 'Buscando…' : 'Buscar emisoras'}
          </button>
        </div>
        <p className="mt-3 text-sm text-ink/65">Buscamos en Radio Browser. Solo mostramos candidatas con señal cristiana, stream HTTPS y estado técnico activo. La importación vuelve a comprobar el audio antes de guardar.</p>
      </section>

      {message && <p role="status" className="rounded-xl border border-line bg-white px-4 py-3 text-sm">{message}</p>}

      {results.length > 0 && (
        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl">Emisoras encontradas</h2><p className="text-sm text-ink/65">Seleccioná hasta 20 por importación.</p><button type="button" onClick={() => setSelected(results.slice(0, 20).map((station) => station.stationUuid))} disabled={pending || results.length === 0} className="mt-2 text-sm font-semibold text-sky underline">Seleccionar primeras 20</button></div>
            <button type="button" onClick={importSelected} disabled={pending || selected.length === 0} className="btn btn-primary">
              {pending ? 'Procesando…' : `Importar seleccionadas (${selected.length}/20)`}
            </button>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {results.map((station) => (
              <li key={station.stationUuid} className="flex items-start gap-3 p-4">
                <input type="checkbox" aria-label={`Seleccionar ${station.name}`} checked={selected.includes(station.stationUuid)} disabled={pending || (!selected.includes(station.stationUuid) && selected.length >= 20)} onChange={() => toggle(station.stationUuid)} className="mt-1 h-5 w-5 shrink-0 accent-[#12284B]" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{station.name}</p>
                  <p className="mt-0.5 text-xs text-ink/60">{station.countryCode} · {station.language.toUpperCase()} · {station.votes} votos</p>
                  <p className="mt-2 break-all text-xs text-ink/60">{station.streamUrl}</p>
                  <p className="mt-1 text-xs text-ink/60">Etiquetas: {station.tags || 'Sin etiquetas'}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {station.websiteUrl && <a href={station.websiteUrl} target="_blank" rel="noreferrer" className="text-sky underline">Sitio web</a>}
                    {station.logoUrl && <span className="text-ink/60">Logo disponible</span>}
                    <span className="font-semibold text-ok">HTTPS · revisión inicial OK</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {results.length === 0 && !pending && message.startsWith('Se encontraron') && (
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink/65">No hay resultados que cumplan los filtros. Probá con otra frase o país.</p>
      )}

      {imported.length > 0 && (
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="font-semibold">Importadas como borrador</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {imported.map((item) => <li key={item.id}><Link className="text-sky underline" href={`/admin/radios/${item.id}`}>{item.name} · Editar radio</Link></li>)}
          </ul>
        </section>
      )}

      {skipped.length > 0 && (
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="font-semibold">No se importaron</h2>
          <ul className="mt-3 grid gap-2 text-sm">{skipped.map((item, index) => <li key={`${item.name}-${index}`}><strong>{item.name}:</strong> {item.reason}</li>)}</ul>
        </section>
      )}
    </div>
  );
}

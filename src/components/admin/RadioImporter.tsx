'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { importRadioCandidates, searchRadioCandidates, type RadioCandidate } from '@/app/admin/importar/actions';

type CountryOption = { id: string; code: string; name: string };

const EXISTING_STATUS: Record<string, { label: string; className: string }> = {
  published: { label: 'Publicada', className: 'bg-emerald-50 text-emerald-800' },
  draft: { label: 'Borrador', className: 'bg-amber-50 text-amber-800' },
  suspended: { label: 'Suspendida', className: 'bg-rose-50 text-rose-800' },
  archived: { label: 'Archivada', className: 'bg-slate-100 text-slate-700' },
};

export function RadioImporter({ countries }: { countries: CountryOption[] }) {
  const [country, setCountry] = useState(countries.find((item) => item.code === 'AR')?.code ?? countries[0]?.code ?? '');
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<RadioCandidate[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [manualAudioConfirmed, setManualAudioConfirmed] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [skipped, setSkipped] = useState<{ name: string; reason: string }[]>([]);
  const [imported, setImported] = useState<{ id: string; name: string }[]>([]);
  const [pending, startTransition] = useTransition();
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const search = () => {
    setMessage('');
    setImported([]);
    setSkipped([]);
    startTransition(async () => {
      const response = await searchRadioCandidates(country, term);
      setMessage(response.message);
      setResults(response.ok ? response.data ?? [] : []);
      setSelected([]);
      setManualAudioConfirmed([]);
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
      const response = await importRadioCandidates(selected, manualAudioConfirmed);
      setMessage(response.message);
      setImported(response.data?.imported ?? []);
      setSkipped(response.data?.skipped ?? []);
      if (response.ok) { setSelected([]); setManualAudioConfirmed([]); }
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
            Búsqueda opcional por nombre o frase
            <input id="import-term" value={term} onChange={(event) => setTerm(event.target.value)} maxLength={80} className="field" placeholder="Dejalo vacío para explorar todo el país" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); search(); } }} />
          </label>
          <button type="button" onClick={search} disabled={pending || !country} className="btn btn-dark">
            {pending ? 'Buscando…' : 'Buscar emisoras'}
          </button>
        </div>
        <p className="mt-3 text-sm text-ink/65">Si dejás la búsqueda vacía, exploramos hasta 500 emisoras del país y filtramos candidatas con señales cristianas o family friendly en el nombre o las etiquetas. También podés escribir una frase para acotar. Solo mostramos streams HTTPS activos; la importación vuelve a comprobar el audio antes de guardar. Si escuchaste una emisora y funciona pero el detector no reconoce su formato, marcá la confirmación manual: igualmente exigiremos una respuesta HTTPS válida y rechazaremos páginas web y listas de reproducción.</p>
      </section>

      {message && <p role="status" className="rounded-xl border border-line bg-white px-4 py-3 text-sm">{message}</p>}

      {results.length > 0 && (
        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-xl">Emisoras encontradas</h2><p className="text-sm text-ink/65">Seleccioná hasta 20 por importación. Las radios existentes quedan excluidas automáticamente.</p><button type="button" onClick={() => setSelected(results.filter((station) => !station.existingStation).slice(0, 20).map((station) => station.stationUuid))} disabled={pending || results.length === 0} className="mt-2 text-sm font-semibold text-sky underline">Seleccionar primeras 20</button></div>
            <button type="button" onClick={importSelected} disabled={pending || selected.length === 0} className="btn btn-primary">
              {pending ? 'Procesando…' : `Importar seleccionadas (${selected.length}/20)`}
            </button>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {results.map((station) => (
              <li key={station.stationUuid} className="flex items-start gap-3 p-4">
                <input type="checkbox" aria-label={`Seleccionar ${station.name}`} checked={selected.includes(station.stationUuid)} disabled={pending || Boolean(station.existingStation) || (!selected.includes(station.stationUuid) && selected.length >= 20)} onChange={() => toggle(station.stationUuid)} className="mt-1 h-5 w-5 shrink-0 accent-[#12284B]" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{station.name}</p>
                  <p className="mt-0.5 text-xs text-ink/60">{station.countryCode} · {station.language.toUpperCase()} · {station.votes} votos</p>
                  {station.existingStation && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-2.5 py-1 font-semibold ${EXISTING_STATUS[station.existingStation.status]?.className ?? 'bg-slate-100 text-slate-700'}`}>
                        Ya importada · {EXISTING_STATUS[station.existingStation.status]?.label ?? station.existingStation.status}
                      </span>
                      <Link href={`/admin/radios/${station.existingStation.id}`} className="font-semibold text-sky underline">Abrir ficha existente</Link>
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {station.hasChristianSignal ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">Señales cristianas detectadas</span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">Sin señales cristianas</span>
                    )}
                    {station.hasFamilySignal && <span className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-800">Señales family friendly</span>}
                  </div>
                  {station.christianTags.length > 0 && <p className="mt-2 text-xs text-emerald-800">Tags cristianos: {station.christianTags.join(', ')}</p>}
                  {!station.existingStation && <label className="mt-2 flex items-start gap-2 text-xs text-ink/70"><input type="checkbox" checked={manualAudioConfirmed.includes(station.stationUuid)} onChange={(event) => setManualAudioConfirmed((current) => event.target.checked ? [...current, station.stationUuid] : current.filter((id) => id !== station.stationUuid))} disabled={pending} className="mt-0.5 h-4 w-4 shrink-0 accent-[#12284B]" /><span>Confirmo que escuché esta emisora y funciona. Permitir importarla si el detector automático no reconoce el formato de audio.</span></label>}
                  <p className="mt-1 text-xs text-ink/60">Etiquetas: {station.tags || 'Sin etiquetas'}</p>
                  <div className="mt-3 max-w-md">
                    <audio
                      controls
                      preload="none"
                      className="h-10 w-full"
                      aria-label={`Escuchar ${station.name}`}
                      onPlay={(event) => {
                        const currentAudio = event.currentTarget;
                        if (activeAudioRef.current && activeAudioRef.current !== currentAudio) {
                          activeAudioRef.current.pause();
                        }
                        activeAudioRef.current = currentAudio;
                      }}
                      onPause={(event) => {
                        if (activeAudioRef.current === event.currentTarget) activeAudioRef.current = null;
                      }}
                      onEnded={(event) => {
                        if (activeAudioRef.current === event.currentTarget) activeAudioRef.current = null;
                      }}
                    >
                      <source src={station.streamUrl} />
                      Tu navegador no puede reproducir este stream.
                    </audio>
                  </div>
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
        <p className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink/65">No hay resultados que cumplan los filtros. Probá explorar el país sin texto o elegí otro país.</p>
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

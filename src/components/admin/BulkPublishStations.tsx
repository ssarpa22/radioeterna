'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { publishVerifiedStations } from '@/app/admin/actions';

type Candidate = { id: string; name: string };

export function BulkPublishStations({ stations }: { stations: Candidate[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (stations.length === 0) return null;

  const allSelected = selected.length === stations.length;
  const toggleAll = () => setSelected(allSelected ? [] : stations.slice(0, 50).map((station) => station.id));
  const publish = () => {
    if (!selected.length || !window.confirm(`¿Publicar ${selected.length} radios verificadas? Van a quedar visibles en el directorio público.`)) return;
    setMessage('');
    startTransition(async () => {
      const result = await publishVerifiedStations(selected);
      setMessage(result.message);
      if (result.ok) {
        setSelected([]);
        router.refresh();
      }
    });
  };

  return (
    <section className="mb-6 rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Publicación por lote</h2>
          <p className="text-sm text-ink/65">{stations.length} borradores de esta página tienen verificación válida. Publicá varios de una sola vez.</p>
        </div>
        <button type="button" onClick={publish} disabled={pending || selected.length === 0} className="btn btn-primary">
          {pending ? 'Publicando…' : `Publicar seleccionadas (${selected.length})`}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={pending} className="h-4 w-4 accent-[#12284B]" />
          Seleccionar todas
        </label>
        <span className="text-xs text-ink/60">Máximo 50 por operación · Solo borradores verificados</span>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {stations.slice(0, 50).map((station) => (
          <li key={station.id}>
            <label className="flex items-start gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <input type="checkbox" checked={selected.includes(station.id)} onChange={() => setSelected((current) => current.includes(station.id) ? current.filter((id) => id !== station.id) : current.length < 50 ? [...current, station.id] : current)} disabled={pending} className="mt-0.5 h-4 w-4 shrink-0 accent-[#12284B]" />
              <span>{station.name}</span>
            </label>
          </li>
        ))}
      </ul>
      {stations.length > 50 && <p className="mt-2 text-xs text-ink/60">Se muestran las primeras 50 radios elegibles de esta página.</p>}
      {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    </section>
  );
}

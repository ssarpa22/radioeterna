'use client';
import Link from 'next/link';
import { Loader2, Pause, Play, RotateCw, Volume2, VolumeX, X } from 'lucide-react';
import { usePlayer } from './PlayerProvider';
import { StationLogo } from '../StationLogo';

const STATUS_TEXT = { idle: '', loading: 'Conectando…', playing: 'En vivo', paused: 'En pausa', error: '' } as const;

export function PlayerBar() {
  const p = usePlayer();
  if (!p.station) return null;
  const { station, status } = p;
  return (
    <>
      <div className="h-24" style={{ height: 'calc(6rem + env(safe-area-inset-bottom))' }} aria-hidden />
      <section aria-label="Reproductor de radio" className="fixed inset-x-0 bottom-0 z-50 border-t border-gold/40 bg-ink text-paper shadow-[0_-8px_30px_rgba(10,23,48,.35)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="wrap flex items-center gap-2 py-3 sm:gap-3">
          <StationLogo name={station.name} src={station.logo_url} className="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <Link href={`/radios/${station.slug}`} className="block truncate font-semibold hover:underline">{station.name}</Link>
            <p role="status" aria-live="polite" className={`truncate text-sm ${status === 'error' ? 'text-[#F2B8B2]' : 'text-gold'}`}>
              {status === 'error' ? p.error : (p.error ?? STATUS_TEXT[status])}
            </p>
          </div>
          {status === 'error' ? (
            <button type="button" onClick={p.retry} aria-label="Reintentar reproducción" className="btn btn-primary h-11 min-w-11 !px-0 sm:!px-4">
              <RotateCw className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Reintentar</span>
            </button>
          ) : (
            <button type="button" onClick={p.toggle} aria-label={status === 'playing' || status === 'loading' ? 'Pausar' : 'Reproducir'}
              className="btn btn-primary h-12 min-w-12 !rounded-full !px-0">
              {status === 'loading' ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> :
               status === 'playing' ? <Pause className="h-5 w-5" fill="currentColor" aria-hidden /> : <Play className="h-5 w-5" fill="currentColor" aria-hidden />}
            </button>
          )}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            <button type="button" onClick={p.toggleMute} aria-label={p.muted || p.volume === 0 ? 'Activar sonido' : 'Silenciar'}
              aria-pressed={p.muted || p.volume === 0} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10">
              {p.muted || p.volume === 0 ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={p.muted ? 0 : p.volume} onChange={(e) => p.setVolume(Number(e.target.value))}
              aria-label="Volumen" className="hidden w-28 accent-[#C9A24A] sm:block" />
          </div>
          <button type="button" onClick={p.stop} aria-label="Cerrar reproductor" className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white/10">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </section>
    </>
  );
}

'use client';
import { Loader2, Pause, Play } from 'lucide-react';
import { usePlayer, type PlayableStation } from './PlayerProvider';

export function PlayButton({ station, size = 'md', label = false }: { station: PlayableStation; size?: 'md' | 'lg'; label?: boolean }) {
  const p = usePlayer();
  const isCurrent = p.station?.id === station.id;
  const active = isCurrent && (p.status === 'playing' || p.status === 'loading');
  const Icon = isCurrent && p.status === 'loading' ? Loader2 : active ? Pause : Play;
  const dim = size === 'lg' ? 'h-14 min-w-14' : 'h-11 min-w-11';
  return (
    <button type="button" onClick={() => (isCurrent ? p.toggle() : p.play(station))}
      aria-label={`${active ? 'Pausar' : 'Escuchar'} ${station.name}`} aria-pressed={active}
      className={`btn btn-primary ${dim} shrink-0 !rounded-full ${label ? 'px-6' : '!px-0'}`}>
      <Icon className={`h-5 w-5 ${isCurrent && p.status === 'loading' ? 'animate-spin' : ''}`} fill={Icon === Loader2 ? 'none' : 'currentColor'} aria-hidden />
      {label && <span>{active ? 'Pausar' : 'Escuchar en vivo'}</span>}
    </button>
  );
}

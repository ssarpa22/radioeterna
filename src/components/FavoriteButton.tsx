'use client';
import { Heart } from 'lucide-react';
import { useFavorites } from '@/lib/favorites';
import type { PlayableStation } from './player/PlayerProvider';

export function FavoriteButton({ station }: { station: PlayableStation }) {
  const { isFavorite, toggle } = useFavorites();
  const on = isFavorite(station.id);
  return (
    <button type="button" onClick={() => toggle(station)} aria-pressed={on}
      aria-label={on ? `Quitar ${station.name} de favoritas` : `Guardar ${station.name} en favoritas`}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-navy hover:bg-gold-soft">
      <Heart className="h-5 w-5" fill={on ? '#C9A24A' : 'none'} stroke={on ? '#7A5C14' : 'currentColor'} aria-hidden />
    </button>
  );
}

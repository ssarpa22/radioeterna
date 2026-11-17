'use client';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { PlayableStation } from '@/components/player/PlayerProvider';

// Anonymous favorites live in this browser only (localStorage). Account sync (favorites table) is a later phase.
const KEY = 'eterna.favorites';
const listeners = new Set<() => void>();
const raw = () => { try { return localStorage.getItem(KEY) ?? '[]'; } catch { return '[]'; } };
const subscribe = (cb: () => void) => { listeners.add(cb); window.addEventListener('storage', cb); return () => { listeners.delete(cb); window.removeEventListener('storage', cb); }; };

export function useFavorites() {
  const snapshot = useSyncExternalStore(subscribe, raw, () => '[]');
  // Keep the server and hydration snapshots consistent; reveal the empty state only after localStorage is read.
  const isHydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const list = useMemo<PlayableStation[]>(() => { try { const v = JSON.parse(snapshot); return Array.isArray(v) ? v : []; } catch { return []; } }, [snapshot]);
  const toggle = useCallback((s: PlayableStation) => {
    const next = list.some((f) => f.id === s.id) ? list.filter((f) => f.id !== s.id) : [{ id: s.id, name: s.name, slug: s.slug, logo_url: s.logo_url, stream_url: s.stream_url, stream_format: s.stream_format, country_name: s.country_name }, ...list];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    listeners.forEach((l) => l());
  }, [list]);
  return { list, isHydrated, isFavorite: (id: string) => list.some((f) => f.id === id), toggle };
}

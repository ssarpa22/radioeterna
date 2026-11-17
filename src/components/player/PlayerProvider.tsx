'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type Hls from 'hls.js';

export type PlayableStation = {
  id: string; name: string; slug: string; logo_url: string | null; stream_url: string;
  stream_format: string | null; country_name?: string;
};
export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
type Ctx = {
  station: PlayableStation | null; status: PlayerStatus; error: string | null; volume: number; muted: boolean;
  play: (s: PlayableStation) => void; toggle: () => void; retry: () => void; stop: () => void;
  setVolume: (v: number) => void; toggleMute: () => void;
};
const PlayerContext = createContext<Ctx | null>(null);
export const usePlayer = () => {
  const c = useContext(PlayerContext);
  if (!c) throw new Error('usePlayer debe usarse dentro de PlayerProvider');
  return c;
};

const VOLUME_KEY = 'eterna.volume';

/**
 * One <audio> element for the whole app, owned by the root layout so playback survives navigation.
 * Audio flows directly from the station's server to the browser; nothing is proxied.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const token = useRef(0);             // invalidates async work from a previous station
  const userPaused = useRef(false);
  const current = useRef<PlayableStation | null>(null);
  const [station, setStation] = useState<PlayableStation | null>(null);
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);

  const release = useCallback(() => {
    token.current++;
    hlsRef.current?.destroy(); hlsRef.current = null;
    const a = audioRef.current;
    if (a) { a.pause(); a.removeAttribute('src'); a.load(); } // frees the network connection
  }, []);

  const fail = useCallback((s: PlayableStation, code?: number) => {
    const insecure = s.stream_url.startsWith('http://') && typeof location !== 'undefined' && location.protocol === 'https:';
    let msg = 'No se pudo reproducir esta radio. Puede estar fuera de línea o usar un formato no compatible con tu navegador.';
    if (insecure) msg = 'Esta radio transmite sin cifrado (http) y tu navegador puede bloquearla en un sitio seguro. Prueba en su sitio web oficial.';
    else if (code === 2) msg = 'Se interrumpió la conexión con la radio. Intenta de nuevo.';
    setError(msg); setStatus('error');
  }, []);

  useEffect(() => {
    const a = new Audio();
    a.preload = 'none';
    audioRef.current = a;
    try {
      const saved = parseFloat(localStorage.getItem(VOLUME_KEY) ?? '');
      if (!Number.isNaN(saved)) setVolumeState(Math.min(1, Math.max(0, saved)));
    } catch { /* storage unavailable */ }
    const on = {
      playing: () => { setStatus('playing'); setError(null); },
      waiting: () => { if (!userPaused.current) setStatus('loading'); },
      stalled: () => { if (!userPaused.current) setStatus('loading'); },
      pause: () => { if (userPaused.current) setStatus('paused'); },
      error: () => { if (a.getAttribute('src') && current.current) fail(current.current, a.error?.code); },
    };
    Object.entries(on).forEach(([e, f]) => a.addEventListener(e, f));
    return () => { Object.entries(on).forEach(([e, f]) => a.removeEventListener(e, f)); release(); };
  }, [fail, release]);

  useEffect(() => { const a = audioRef.current; if (a) { a.volume = volume; a.muted = muted; } }, [volume, muted]);

  const start = useCallback(async (s: PlayableStation) => {
    const a = audioRef.current; if (!a) return;
    release();                                  // stop + free previous stream first
    const t = token.current;
    current.current = s; userPaused.current = false;
    setStation(s); setError(null); setStatus('loading');
    try {
      const isHls = s.stream_format === 'hls' || /\.m3u8(\?|$)/i.test(s.stream_url);
      if (isHls && !a.canPlayType('application/vnd.apple.mpegurl')) {
        const { default: HlsLib } = await import('hls.js');
        if (t !== token.current) return;
        if (!HlsLib.isSupported()) throw new Error('hls-unsupported');
        const hls = new HlsLib();
        hlsRef.current = hls;
        hls.on(HlsLib.Events.ERROR, (_e, d) => { if (d.fatal && t === token.current) fail(s); });
        hls.attachMedia(a); hls.loadSource(s.stream_url);
      } else {
        a.src = s.stream_url;
      }
      await a.play();                           // only ever reached from a user click
    } catch (e) {
      if (t !== token.current) return;
      const name = (e as DOMException)?.name;
      if (name === 'AbortError') return;
      if (name === 'NotAllowedError') { setStatus('paused'); setError('Tu navegador pidió una acción manual. Toca reproducir.'); return; }
      fail(s);
    }
  }, [release, fail]);

  const toggle = useCallback(() => {
    const a = audioRef.current; const s = current.current; if (!a || !s) return;
    if (status === 'playing' || status === 'loading') { userPaused.current = true; a.pause(); setStatus('paused'); }
    else void start(s);                         // live radio: resume = reconnect, not seek
  }, [status, start]);

  const stop = useCallback(() => { release(); current.current = null; setStation(null); setStatus('idle'); setError(null); }, [release]);
  const retry = useCallback(() => { if (current.current) void start(current.current); }, [start]);
  const setVolume = useCallback((v: number) => {
    setVolumeState(v); setMuted(v === 0);
    try { localStorage.setItem(VOLUME_KEY, String(v)); } catch { /* ignore */ }
  }, []);
  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  useEffect(() => {                             // lock-screen / headset controls
    if (!('mediaSession' in navigator)) return;
    if (!station) { navigator.mediaSession.metadata = null; return; }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: station.name, artist: 'Radio Eterna',
      artwork: station.logo_url ? [{ src: station.logo_url }] : [],
    });
    navigator.mediaSession.setActionHandler('play', () => toggle());
    navigator.mediaSession.setActionHandler('pause', () => toggle());
  }, [station, toggle]);

  const value = useMemo(() => ({ station, status, error, volume, muted, play: start, toggle, retry, stop, setVolume, toggleMute }),
    [station, status, error, volume, muted, start, toggle, retry, stop, setVolume, toggleMute]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

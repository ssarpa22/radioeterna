'use client';
import { useState } from 'react';

/** Logo with graceful fallback (initials). Plain <img>: logo hosts are arbitrary until logos move to Supabase Storage. */
export function StationLogo({ name, src, className = 'h-14 w-14' }: { name: string; src: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name.replace(/^DEMO\s*·\s*/i, '').split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  if (!src || failed) {
    return <span aria-hidden className={`${className} grid shrink-0 place-items-center rounded-xl bg-navy font-display text-lg text-gold`}>{initials}</span>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className={`${className} shrink-0 rounded-xl bg-white object-contain`} />;
}

import Link from 'next/link';
import { MapPin } from 'lucide-react';
import type { StationCard } from '@/types';
import { PlayButton } from './player/PlayButton';
import { FavoriteButton } from './FavoriteButton';
import { StationLogo } from './StationLogo';

export const toPlayable = (s: StationCard) => ({ id: s.id, name: s.name, slug: s.slug, logo_url: s.logo_url, stream_url: s.stream_url, stream_format: s.stream_format, country_name: s.country_name });

/** Preset-style row: logo, identity, play. `feature` is the larger treatment for featured stations. */
export function StationRow({ s, feature = false }: { s: StationCard; feature?: boolean }) {
  return (
    <li className={`flex items-center gap-3 rounded-2xl border border-line bg-white p-3 sm:gap-4 sm:p-4 ${feature ? 'sm:p-5' : ''}`}>
      <StationLogo name={s.name} src={s.logo_url} className={feature ? 'h-16 w-16 sm:h-20 sm:w-20' : 'h-14 w-14'} />
      <div className="min-w-0 flex-1">
        <h3 className={`truncate font-semibold ${feature ? 'text-xl' : 'text-lg'}`}>
          <Link href={`/radios/${s.slug}`} className="hover:underline">{s.name}</Link>
        </h3>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink/70">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden />{s.city ? `${s.city}, ` : ''}{s.country_name}</span>
          <span>{s.category_name}</span>
        </p>
        {feature && s.short_description && <p className="mt-1 line-clamp-2 text-sm text-ink/80">{s.short_description}</p>}
      </div>
      <FavoriteButton station={toPlayable(s)} />
      <PlayButton station={toPlayable(s)} />
    </li>
  );
}

export function StationList({ items, feature = false }: { items: StationCard[]; feature?: boolean }) {
  return <ul className="grid gap-3">{items.map((s) => <StationRow key={s.id} s={s} feature={feature} />)}</ul>;
}

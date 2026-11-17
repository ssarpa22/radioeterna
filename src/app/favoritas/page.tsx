'use client';
import Link from 'next/link';
import { useFavorites } from '@/lib/favorites';
import { PlayButton } from '@/components/player/PlayButton';
import { FavoriteButton } from '@/components/FavoriteButton';
import { StationLogo } from '@/components/StationLogo';
import { EmptyState, PageHeader } from '@/components/ui';

export default function FavoritesPage() {
  const { list } = useFavorites();
  return (
    <>
      <PageHeader title="Tus radios favoritas" intro="Se guardan solo en este navegador." />
      <div className="wrap py-8">
        {list.length === 0 ? <EmptyState title="Todavía no tienes favoritas" action={<Link href="/radios" className="btn btn-primary">Explorar radios</Link>}>Toca el corazón en cualquier radio para guardarla aquí.</EmptyState> : (
          <ul className="grid gap-3">{list.map((s) => (
            <li key={s.id} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
              <StationLogo name={s.name} src={s.logo_url} />
              <div className="min-w-0 flex-1"><Link href={`/radios/${s.slug}`} className="block truncate text-lg font-semibold hover:underline">{s.name}</Link>{s.country_name && <p className="text-sm text-ink/70">{s.country_name}</p>}</div>
              <FavoriteButton station={s} /><PlayButton station={s} />
            </li>))}</ul>
        )}
      </div>
    </>
  );
}

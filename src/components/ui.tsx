import Link from 'next/link';
import type { ReactNode } from 'react';

export function SectionHeading({ title, href, linkLabel, children }: { title: string; href?: string; linkLabel?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div><h2 className="text-2xl sm:text-3xl">{title}</h2>{children && <p className="mt-1 text-ink/70">{children}</p>}</div>
      {href && <Link href={href} className="shrink-0 text-sm font-semibold text-sky underline-offset-4 hover:underline">{linkLabel ?? 'Ver todo'}</Link>}
    </div>
  );
}
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center">
      <h3 className="text-xl">{title}</h3>
      {children && <p className="mx-auto mt-2 max-w-md text-ink/70">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export function PageHeader({ title, intro, crumb }: { title: string; intro?: ReactNode; crumb?: { href: string; label: string } }) {
  return (
    <header className="border-b border-line bg-white">
      <div className="wrap py-8 sm:py-12">
        {crumb && <Link href={crumb.href} className="text-sm font-semibold text-sky hover:underline">{crumb.label}</Link>}
        <h1 className="mt-1 text-3xl sm:text-5xl">{title}</h1>
        {intro && <p className="mt-3 max-w-2xl text-lg text-ink/75">{intro}</p>}
      </div>
    </header>
  );
}

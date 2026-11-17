'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NAV } from '@/lib/site';

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <circle cx="16" cy="16" r="15" fill="#0A1730" />
        <path d="M16 7.5v17M11.2 13h9.6" stroke="#C9A24A" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <path d="M7.6 11.6a9.6 9.6 0 0 0 0 8.8M24.4 11.6a9.6 9.6 0 0 1 0 8.8" stroke="#C9A24A" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
      <span className={`font-display text-xl font-semibold ${light ? 'text-paper' : 'text-ink'}`}>Radio Eterna</span>
    </span>
  );
}

export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      menuButtonRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const link = (href: string) => path === href || path.startsWith(`${href}/`);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="wrap flex h-16 items-center justify-between">
        <Link href="/" aria-label="Radio Eterna, inicio"><Logo /></Link>
        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => <Link key={n.href} href={n.href} aria-current={link(n.href) ? 'page' : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium hover:bg-gold-soft ${link(n.href) ? 'bg-gold-soft text-gold-deep' : ''}`}>{n.label}</Link>)}
        </nav>
        <button ref={menuButtonRef} type="button" className="grid h-11 w-11 place-items-center rounded-full hover:bg-gold-soft md:hidden" aria-expanded={open} aria-controls="menu-movil" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setOpen((o) => !o)}>
          {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
        </button>
      </div>
      {open && (
        <nav id="menu-movil" aria-label="Principal móvil" className="border-t border-line bg-paper md:hidden">
          <ul className="wrap grid py-2">
            {NAV.map((n) => <li key={n.href}><Link href={n.href} aria-current={link(n.href) ? 'page' : undefined} className="flex min-h-[48px] items-center text-lg font-medium">{n.label}</Link></li>)}
          </ul>
        </nav>
      )}
    </header>
  );
}

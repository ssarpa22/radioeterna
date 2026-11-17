import Link from 'next/link';
import { Logo } from './Header';
import { FOOTER_LINKS, NAV, SITE } from '@/lib/site';

export function Footer() {
  return (
    <footer className="mt-20 bg-ink text-paper/80">
      <div className="wrap grid gap-8 py-12 md:grid-cols-[1.5fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-3 max-w-md text-sm leading-relaxed">Radio Eterna reúne radios cristianas y evangélicas. El audio lo transmite cada radio desde su propio servidor; no lo alojamos ni lo retransmitimos.</p>
        </div>
        <nav aria-label="Pie de página"><ul className="grid gap-2 text-sm">
          {[...NAV, ...FOOTER_LINKS].map((n) => <li key={n.href}><Link href={n.href} className="hover:text-gold">{n.label}</Link></li>)}
        </ul></nav>
      </div>
      <div className="border-t border-white/10"><p className="wrap py-4 text-xs text-paper/60">© {new Date().getFullYear()} Radio Eterna · {SITE.credit}</p></div>
    </footer>
  );
}

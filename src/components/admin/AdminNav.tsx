'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS: [string, string][] = [
  ['/admin', 'Resumen'],
  ['/admin/radios', 'Radios'],
  ['/admin/monitoreo', 'Monitoreo web'],
  ['/admin/importar', 'Importar emisoras'],
  ['/admin/solicitudes', 'Solicitudes'],
  ['/admin/categorias', 'Categorías'],
  ['/admin/paises', 'Países'],
  ['/admin/configuracion', 'Configuración'],
];

export function AdminNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Navegación del panel" className="flex flex-wrap gap-1">
      {LINKS.map(([href, label]) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-3 py-2 text-sm hover:bg-white/10 ${active ? 'bg-white/15 font-semibold text-white' : 'text-paper/85'}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

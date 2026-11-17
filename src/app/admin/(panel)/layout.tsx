import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { logoutAction } from '../actions';

export const metadata: Metadata = { title: { default: 'Panel', template: '%s · Panel' }, robots: { index: false, follow: false } };
const LINKS = [['/admin', 'Resumen'], ['/admin/radios', 'Radios'], ['/admin/solicitudes', 'Solicitudes'], ['/admin/categorias', 'Categorías'], ['/admin/paises', 'Países'], ['/admin/configuracion', 'Configuración']];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();   // authorization lives here AND in every action/page; middleware is only a first gate
  return (
    <>
      <div className="border-b border-line bg-navy text-paper">
        <div className="wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2">
          <nav aria-label="Panel" className="flex flex-wrap gap-1">{LINKS.map(([h, l]) => <Link key={h} href={h} className="rounded-full px-3 py-2 text-sm hover:bg-white/10">{l}</Link>)}</nav>
          <form action={logoutAction} className="flex items-center gap-3 text-sm"><span className="text-paper/70">{staff.name} · {staff.role === 'super_admin' ? 'Superadministrador' : staff.role === 'admin' ? 'Administrador' : 'Editor'}</span>
            <button type="submit" className="rounded-full border border-white/30 px-3 py-1.5 hover:bg-white/10">Salir</button></form>
        </div>
      </div>
      {children}
    </>
  );
}

import type { Metadata } from 'next';
import { requireStaff } from '@/lib/auth';
import { logoutAction } from '../actions';
import { AdminNav } from '@/components/admin/AdminNav';

export const metadata: Metadata = { title: { default: 'Panel', template: '%s · Panel' }, robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();   // authorization lives here AND in every action/page; middleware is only a first gate
  return (
    <>
      <div className="border-b border-line bg-navy text-paper">
        <div className="wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-2">
          <AdminNav />
          <form action={logoutAction} className="flex items-center gap-3 text-sm"><span className="text-paper/70">{staff.name} · {staff.role === 'super_admin' ? 'Superadministrador' : staff.role === 'admin' ? 'Administrador' : 'Editor'}</span>
            <button type="submit" className="rounded-full border border-white/30 px-3 py-1.5 hover:bg-white/10">Salir</button></form>
        </div>
      </div>
      {children}
    </>
  );
}

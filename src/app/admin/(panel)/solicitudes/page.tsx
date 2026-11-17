import type { Metadata } from 'next';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SUBMISSION_LABEL, fmtDate } from '@/lib/labels';
import { EmptyState, PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Solicitudes' };
export default async function Submissions({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireStaff(); const { estado = 'pending' } = await searchParams; const supabase = await createClient();
  const f = Object.keys(SUBMISSION_LABEL).includes(estado) ? estado : 'pending';
  const { data, error } = await supabase.from('station_submissions').select('id, station_name, status, created_at, country:countries(name)').eq('status', f).order('created_at', { ascending: false }).limit(100);
  return (
    <>
      <PageHeader title="Solicitudes de radios" />
      <div className="wrap py-8">
        <nav aria-label="Filtrar por estado" className="mb-6 flex gap-2">{Object.entries(SUBMISSION_LABEL).map(([v, l]) => <Link key={v} href={`/admin/solicitudes?estado=${v}`} aria-current={f === v ? 'page' : undefined} className={`chip ${f === v ? '!border-navy !bg-gold-soft' : ''}`}>{l}</Link>)}</nav>
        {error && <p role="alert" className="mb-4 text-danger">No se pudo cargar la lista.</p>}
        {(data ?? []).length === 0 ? <EmptyState title="No hay solicitudes en este estado" /> :
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white">{(data ?? []).map((s) => (
            <li key={s.id}><Link href={`/admin/solicitudes/${s.id}`} className="flex flex-wrap justify-between gap-2 px-4 py-3 hover:bg-gold-soft/40"><span className="font-semibold">{s.station_name}</span>
              <span className="text-sm text-ink/70">{(s.country as unknown as { name: string } | null)?.name} · {fmtDate(s.created_at)}</span></Link></li>))}</ul>}
      </div>
    </>
  );
}

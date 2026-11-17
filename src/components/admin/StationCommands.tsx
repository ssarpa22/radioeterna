'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { stationCommand, type StationCommand } from '@/app/admin/actions';
import type { CommandResult } from '@/lib/form';
import { VerifyResultView } from './VerifyResultView';

type Btn = { cmd: StationCommand; label: string; confirm?: string; kind?: string; disabled?: boolean; title?: string };

export function StationCommands({ id, status, featured, verification, deleted, isAdmin }:
  { id: string; status: string; featured: boolean; verification: string; deleted: boolean; isAdmin: boolean }) {
  const [pending, start] = useTransition(); const [res, setRes] = useState<CommandResult | null>(null); const router = useRouter();
  const run = (cmd: StationCommand, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => { setRes(await stationCommand(id, cmd)); router.refresh(); });
  };
  const canPublish = verification === 'verified' || verification === 'manual';
  // Plain render helper (called as a function, not used as <Component/>) so buttons keep identity and keyboard focus across renders.
  const btn = ({ cmd, label, confirm, kind = 'btn-ghost', disabled, title }: Btn) => (
    <button key={cmd} type="button" className={`btn ${kind}`} disabled={pending || disabled} title={title} onClick={() => run(cmd, confirm)}>{label}</button>);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {deleted ? btn({ cmd: 'restore', label: 'Restaurar' }) : <>
          {btn({ cmd: 'verify', label: pending ? 'Trabajando…' : 'Verificar enlace', kind: 'btn-dark' })}
          {btn({ cmd: 'verify_manual', label: 'Marcar verificada a mano', confirm: '¿Confirmas que escuchaste esta radio y el enlace funciona? Esto permite publicarla.' })}
          {status !== 'published' && btn({ cmd: 'publish', label: 'Publicar', kind: 'btn-primary', disabled: !canPublish, title: canPublish ? undefined : 'Primero verifica el enlace', confirm: '¿Publicar esta radio en el directorio público?' })}
          {status === 'published' && btn({ cmd: 'unpublish', label: 'Despublicar', confirm: 'La radio dejará de verse en el sitio. ¿Continuar?' })}
          {status !== 'suspended' && btn({ cmd: 'suspend', label: 'Suspender', confirm: '¿Suspender esta radio?' })}
          {btn({ cmd: featured ? 'unfeature' : 'feature', label: featured ? 'Quitar de destacadas' : 'Destacar' })}
          {status !== 'archived' && btn({ cmd: 'archive', label: 'Archivar', confirm: '¿Archivar esta radio?' })}
          {isAdmin && btn({ cmd: 'delete', label: 'Eliminar', confirm: '¿Eliminar esta radio? Dejará de aparecer en el panel y en el sitio.' })}
        </>}
      </div>
      {res && <p role={res.ok ? 'status' : 'alert'} className={`text-sm ${res.ok ? 'text-ok' : 'text-danger'}`}>{res.message}</p>}
      {res?.result && <VerifyResultView r={res.result} />}
    </div>
  );
}

'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submissionCommand } from '@/app/admin/actions';
import type { CommandResult } from '@/lib/form';
import { VerifyResultView } from './VerifyResultView';

export function SubmissionCommands({ id }: { id: string }) {
  const [pending, start] = useTransition(); const [res, setRes] = useState<CommandResult | null>(null); const router = useRouter();
  const run = (cmd: 'approve' | 'reject' | 'test') => {
    let notes: string | undefined;
    if (cmd === 'approve' && !window.confirm('Se creará una radio en borrador (sin publicar). ¿Aprobar la solicitud?')) return;
    if (cmd === 'reject') { const n = window.prompt('Motivo del rechazo (nota interna, opcional):'); if (n === null) return; notes = n; }
    start(async () => {
      const r = await submissionCommand(id, cmd, notes); setRes(r);
      if (r.ok && cmd === 'approve' && r.id) router.push(`/admin/radios/${r.id}`); else router.refresh();
    });
  };
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => run('test')} className="btn btn-ghost">Probar enlace</button>
        <button type="button" disabled={pending} onClick={() => run('approve')} className="btn btn-primary">Aprobar</button>
        <button type="button" disabled={pending} onClick={() => run('reject')} className="btn btn-ghost">Rechazar</button>
      </div>
      {res && <p role={res.ok ? 'status' : 'alert'} className={`text-sm ${res.ok ? 'text-ok' : 'text-danger'}`}>{res.message}</p>}
      {res?.result && <VerifyResultView r={res.result} />}
    </div>
  );
}

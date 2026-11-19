'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { stationCommand } from '@/app/admin/actions';
import type { CommandResult } from '@/lib/form';

export function DiagnosticActions({ stationId, website }: { stationId: string; website: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CommandResult | null>(null);
  const router = useRouter();
  const run = () => {
    startTransition(async () => {
      const response = await stationCommand(stationId, website ? 'verify_website' : 'verify');
      setResult(response);
      router.refresh();
    });
  };

  return (
    <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
      <button type="button" className={`btn ${website ? 'btn-ghost' : 'btn-dark'}`} disabled={pending} onClick={run}>
        {pending ? 'Comprobando…' : website ? 'Revisar HTTPS' : 'Reintentar stream'}
      </button>
      {result && <p role={result.ok ? 'status' : 'alert'} className={`max-w-sm text-xs md:text-right ${result.ok ? 'text-ok' : 'text-danger'}`}>{result.message}</p>}
    </div>
  );
}

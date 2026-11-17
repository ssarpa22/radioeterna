import type { VerifyResult } from '@/lib/security/verify-stream';
import { fmtDate } from '@/lib/labels';

export function VerifyResultView({ r }: { r: VerifyResult }) {
  const headline = r.audio_detected ? `Se detectó audio${r.detected_format ? ` (${r.detected_format.toUpperCase()})` : ''}`
    : r.reachable ? 'El servidor responde, pero no se detectó audio' : 'No se pudo comprobar el enlace';
  return (
    <div className={`rounded-xl border p-4 text-sm ${r.audio_detected ? 'border-ok/40 bg-[#E6F2EC]' : 'border-danger/30 bg-[#F8E5E3]'}`} role="status">
      <p className="font-semibold">{headline}</p>
      {r.error && <p className="mt-1">{r.error}</p>}
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-ink/80">
        <dt>Código HTTP</dt><dd>{r.http_status ?? '—'}</dd>
        <dt>Tipo de contenido</dt><dd className="break-all">{r.content_type ?? '—'}</dd>
        <dt>Redirecciones</dt><dd>{r.redirects}</dd>
        <dt>Enlace final</dt><dd className="break-all">{r.final_url ?? '—'}</dd>
        <dt>Duración</dt><dd>{r.duration_ms} ms</dd><dt>Revisado</dt><dd>{fmtDate(r.checked_at)}</dd>
      </dl>
      {r.notes.map((n) => <p key={n} className="mt-2">{n}</p>)}
      <p className="mt-2 text-ink/60">Detectar audio no garantiza que todos los navegadores puedan reproducirlo. Prueba también el reproductor.</p>
    </div>
  );
}

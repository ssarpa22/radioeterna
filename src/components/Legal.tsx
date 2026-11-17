import type { ReactNode } from 'react';
import { PageHeader } from './ui';

/** Wrapper for legal pages. The banner is intentional: remove it only after a lawyer has reviewed the text. */
export function LegalDoc({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <PageHeader title={title} intro={`Última actualización: ${updated}`} />
      <div className="wrap py-8">
        <aside role="note" className="mb-8 max-w-[68ch] rounded-xl border border-gold bg-gold-soft px-4 py-3 text-sm text-gold-deep">
          <strong>Borrador pendiente de revisión profesional.</strong> Este texto es un punto de partida y debe ser revisado por un profesional legal antes del lanzamiento.
        </aside>
        <div className="prose-es grid gap-8">{children}</div>
      </div>
    </>
  );
}
export const LegalSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section><h2 className="mb-2 text-2xl">{title}</h2><div className="grid gap-3">{children}</div></section>
);

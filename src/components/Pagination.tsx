import Link from 'next/link';
export function Pagination({ basePath, params, page, total, pageSize }: { basePath: string; params: Record<string, string | undefined>; page: number; total: number; pageSize: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => { const q = new URLSearchParams(); Object.entries(params).forEach(([k, v]) => v && q.set(k, v)); if (p > 1) q.set('pagina', String(p)); const s = q.toString(); return s ? `${basePath}?${s}` : basePath; };
  return (
    <nav aria-label="Paginación" className="mt-8 flex items-center justify-between gap-4">
      {page > 1 ? <Link href={href(page - 1)} rel="prev" className="btn btn-ghost">Anterior</Link> : <span />}
      <span className="text-sm text-ink/70">Página {page} de {pages}</span>
      {page < pages ? <Link href={href(page + 1)} rel="next" className="btn btn-ghost">Siguiente</Link> : <span />}
    </nav>
  );
}

export default function Loading() {
  return (<div className="wrap py-10" role="status" aria-label="Cargando"><div className="mb-8 h-10 w-2/3 animate-pulse rounded-lg bg-line" />
    <div className="grid gap-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-line/70" />)}</div></div>);
}

'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (<div className="wrap py-24 text-center" role="alert"><h1 className="text-4xl">No pudimos cargar esta página</h1>
    <p className="mx-auto mt-3 max-w-md text-ink/70">Hubo un problema al obtener los datos. Intenta de nuevo en unos segundos.</p>
    <button type="button" onClick={reset} className="btn btn-dark mt-6">Reintentar</button></div>);
}

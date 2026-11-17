import Link from 'next/link';
export default function NotFound() {
  return (<div className="wrap py-24 text-center"><h1 className="text-4xl">No encontramos esta página</h1><p className="mx-auto mt-3 max-w-md text-ink/70">Es posible que la dirección haya cambiado o que la radio ya no esté publicada.</p>
    <div className="mt-6 flex justify-center gap-3"><Link href="/" className="btn btn-dark">Ir al inicio</Link><Link href="/radios" className="btn btn-ghost">Ver radios</Link></div></div>);
}

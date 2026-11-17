import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublicSettings } from '@/lib/data/settings';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Contacto', description: 'Escríbenos para consultas, correcciones o para retirar la ficha de una radio.', alternates: { canonical: '/contacto' } };

export default async function ContactPage() {
  const { contactEmail } = await getPublicSettings();
  return (
    <>
      <PageHeader title="Contacto" intro="Estamos para ayudarte con consultas, correcciones y solicitudes de retiro." />
      <div className="wrap grid max-w-3xl gap-10 py-8">
        <section aria-labelledby="escribir"><h2 id="escribir" className="mb-2 text-2xl">Escríbenos</h2>
          {contactEmail ? <p className="prose-es"><a href={`mailto:${contactEmail}`} className="font-semibold text-sky hover:underline">{contactEmail}</a></p>
            : <p className="prose-es">El correo de contacto todavía no está disponible. Mientras tanto, puedes <Link href="/sumar-radio" className="text-sky hover:underline">enviar la solicitud de tu radio</Link> desde el formulario.</p>}</section>
        <section aria-labelledby="correccion"><h2 id="correccion" className="mb-2 text-2xl">¿Eres responsable de una radio listada?</h2>
          <p className="prose-es">Puedes pedirnos corregir los datos de tu ficha o retirarla del directorio. Escríbenos desde un correo de tu radio e indica el nombre de la radio, el enlace de su ficha en Radio Eterna y qué deseas cambiar. Podemos pedirte una comprobación de que representas a la radio. Atendemos estas solicitudes lo antes posible.</p></section>
        <section aria-labelledby="enlace"><h2 id="enlace" className="mb-2 text-2xl">¿Una radio no suena?</h2>
          <p className="prose-es">Cuéntanos el nombre de la radio y qué mensaje ves en el reproductor. Muchas veces el problema está en la transmisión de la propia radio, que Radio Eterna no controla.</p></section>
      </div>
    </>
  );
}

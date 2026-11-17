import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDoc, LegalSection } from '@/components/Legal';

export const metadata: Metadata = { title: 'Términos de servicio', description: 'Condiciones de uso de Radio Eterna.', alternates: { canonical: '/terminos' } };

export default function TermsPage() {
  return (
    <LegalDoc title="Términos de servicio" updated="noviembre de 2026">
      <LegalSection title="El servicio"><p>Radio Eterna es un directorio independiente de radios cristianas y evangélicas con un reproductor que se conecta a transmisiones de terceros. Lo ofrece y mantiene Lazo Sur.</p></LegalSection>
      <LegalSection title="El audio pertenece a cada radio">
        <p>Las transmisiones, nombres, logos y marcas pertenecen a sus respectivas radios y proveedores. Radio Eterna no aloja, graba, descarga ni retransmite audio: tu navegador se conecta directamente a la transmisión de cada radio.</p>
        <p>No garantizamos que una transmisión esté disponible, sea continua o funcione en todos los dispositivos. Que una radio aparezca en el directorio no implica afiliación, respaldo ni relación oficial con Radio Eterna, salvo que se indique expresamente.</p>
      </LegalSection>
      <LegalSection title="Solicitudes de radios">
        <p>Al enviar una solicitud declaras que estás autorizado/a para representar a la radio y para pedir su inclusión, y que la información es veraz. Revisamos cada solicitud y podemos aceptarla, rechazarla, editarla o retirarla en cualquier momento. Enviar una solicitud no garantiza su publicación.</p>
        <p>No debes enviar contenido que infrinja derechos de terceros. Los logos se publican solo con autorización o una base legítima.</p>
      </LegalSection>
      <LegalSection title="Corrección y retiro"><p>Si eres responsable de una radio, puedes pedir corregir o retirar su ficha desde la página de <Link href="/contacto" className="text-sky hover:underline">Contacto</Link>.</p></LegalSection>
      <LegalSection title="Uso aceptable"><p>No uses el sitio para vulnerar su seguridad, saturarlo con solicitudes automatizadas, enviar spam ni acceder a áreas restringidas.</p></LegalSection>
      <LegalSection title="Limitación de responsabilidad"><p>El servicio se ofrece «tal cual». En la medida permitida por la ley, Lazo Sur no responde por la disponibilidad de transmisiones de terceros ni por el contenido que emiten. <em>[Revisar alcance y redacción con un profesional legal.]</em></p></LegalSection>
      <LegalSection title="Cambios y ley aplicable"><p>Podemos modificar estos términos; la fecha de actualización figura arriba. <em>[Definir ley aplicable y jurisdicción con un profesional legal.]</em></p></LegalSection>
    </LegalDoc>
  );
}

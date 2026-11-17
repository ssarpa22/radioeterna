import type { Metadata } from 'next';
import { getPublicSettings } from '@/lib/data/settings';
import { LegalDoc, LegalSection } from '@/components/Legal';

export const metadata: Metadata = { title: 'Política de privacidad', description: 'Qué datos recopila Radio Eterna, para qué los usa y cuáles son tus derechos.', alternates: { canonical: '/privacidad' } };

export default async function PrivacyPage() {
  const { contactEmail } = await getPublicSettings();
  return (
    <LegalDoc title="Política de privacidad" updated="noviembre de 2026">
      <LegalSection title="Quiénes somos"><p>Radio Eterna es un directorio de radios cristianas y evangélicas. La plataforma es desarrollada y mantenida por Lazo Sur. {contactEmail ? <>Para consultas sobre privacidad escríbenos a {contactEmail}.</> : <>Los datos de contacto figuran en la página de Contacto.</>}</p></LegalSection>
      <LegalSection title="Qué datos recopilamos">
        <p><strong>Visitantes.</strong> No pedimos que crees una cuenta para escuchar radio. Tus radios favoritas y el volumen se guardan únicamente en tu navegador (almacenamiento local) y no los recibimos.</p>
        <p><strong>Solicitudes de radios.</strong> Si envías el formulario «Suma tu radio», guardamos el nombre de la radio, ciudad, país, sitio web, enlace de transmisión, descripción, enlace del logo, y tu nombre y correo electrónico, para evaluar la solicitud y contactarte.</p>
        <p><strong>Equipo administrador.</strong> Guardamos las cuentas del equipo y un registro de sus acciones en el panel.</p>
        <p><strong>Datos técnicos.</strong> Para limitar el abuso, el servidor puede usar tu dirección IP de forma temporal (por ejemplo, para contar envíos por hora). Con el limitador externo configurado, la IP se almacena como huella (hash) y no en claro.</p>
      </LegalSection>
      <LegalSection title="El audio y tu dirección IP">
        <p>Radio Eterna no aloja ni retransmite el audio. Al pulsar «Escuchar», tu navegador se conecta directamente al servidor de la radio o de su proveedor, que verá tu dirección IP y datos técnicos del navegador, y se rige por sus propias políticas. No controlamos ese tratamiento.</p>
      </LegalSection>
      <LegalSection title="Para qué usamos los datos">
        <ul className="list-disc pl-6"><li>Evaluar, aprobar o rechazar solicitudes de radios.</li><li>Contactar a quien envió la solicitud.</li><li>Mantener la seguridad del sitio y prevenir spam.</li><li>Operar y mejorar el directorio.</li></ul>
        <p>No vendemos datos personales ni los usamos para publicidad.</p>
      </LegalSection>
      <LegalSection title="Proveedores que intervienen">
        <p>Para operar el sitio usamos proveedores de infraestructura: alojamiento de la aplicación, base de datos y autenticación, y, si están activados, un servicio de verificación anti-spam y un servicio de limitación de solicitudes. Estos proveedores pueden tratar datos en otros países. <em>[Completar con los nombres, países y bases legales definitivos tras la revisión legal.]</em></p>
      </LegalSection>
      <LegalSection title="Conservación y tus derechos">
        <p>Conservamos las solicitudes mientras sean necesarias para gestionarlas y por un tiempo razonable después. Puedes pedir acceso, rectificación o supresión de tus datos, o retirar una ficha, escribiéndonos desde la página de Contacto. <em>[Ajustar plazos y derechos según la legislación aplicable, por ejemplo la normativa de protección de datos personales de tu país.]</em></p>
      </LegalSection>
      <LegalSection title="Cambios"><p>Podemos actualizar esta política. La fecha de la última actualización figura arriba.</p></LegalSection>
    </LegalDoc>
  );
}

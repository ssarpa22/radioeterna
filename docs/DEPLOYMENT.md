# Despliegue de Radio Eterna

Esta guía describe el despliegue actual y las tareas que todavía requieren configuración. No compres ni contrates servicios sin evaluar antes el costo y la necesidad.

## Arquitectura

| Función | Servicio | Notas |
|---|---|---|
| Aplicación | Vercel | Next.js necesita runtime Node |
| Base de datos y Auth | Supabase | PostgreSQL + RLS |
| Dominio y DNS | Registrador / Vercel | Configurar según los valores que indique Vercel |
| HTTPS | Vercel | Certificado gestionado por Vercel |
| Anti-spam | Cloudflare Turnstile | En producción requiere site key y secret key |
| Rate limiting distribuido | Upstash Redis | Opcional; sin backend distribuido el límite puede ser por instancia |
| Correo transaccional | No implementado | No hay notificaciones por correo |

## Entornos

- **Local:** Supabase local con `supabase start`.
- **Preview/staging:** idealmente un proyecto Supabase separado y el entorno Preview de Vercel.
- **Producción:** proyecto Supabase de producción y entorno Production de Vercel.

No compartas credenciales entre entornos.

## Variables de entorno

En Vercel → Settings → Environment Variables, configurar según el entorno:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

Opcionales:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

En producción, ambas variables de Turnstile son necesarias para habilitar los envíos públicos. Si falta alguna, el formulario rechaza el envío de forma segura. No configures `SUPABASE_SERVICE_ROLE_KEY`: la aplicación no la necesita.

## Base de datos y migraciones

Las migraciones SQL versionadas se encuentran en `supabase/migrations/`. La serie actual llega a `0008_website_verification_expiry.sql`.

La migración 0007 agrega `stations.website_is_secure`, aplicada manualmente en el proyecto de producción. La migración 0008 agrega `stations.website_verified_at`: una verificación HTTPS correcta dura 30 días; después el sitio oficial vuelve a ocultarse hasta una nueva comprobación. Antes de desplegar esta versión en producción, aplicá la migración 0008 mediante SQL Editor, después de revisar el historial y hacer un backup.

**Antes de aplicar migraciones en una base existente:**

1. Hacé un backup.
2. Revisá el historial de migraciones de esa base.
3. Aplicá solo las migraciones que realmente falten, en orden.
4. No ejecutes de nuevo scripts manuales ni uses `supabase db push` sin comprobar primero el estado y el vínculo del proyecto.
5. Nunca ejecutes `supabase/seed.sql` en producción: contiene datos DEMO.

En una base local nueva, seguí el flujo de Supabase CLI documentado por el proyecto y comprobá que todas las migraciones se apliquen correctamente. Verificá también que `site_settings.allow_demo_data` esté en `false` en producción.

## Primer administrador

Seguí [ADMIN-SETUP.md](ADMIN-SETUP.md). No habilites registros públicos de usuarios si no forman parte del modelo operativo del sitio.

## Despliegue en Vercel

1. Importá el repositorio GitHub en Vercel.
2. Confirmá que el framework detectado sea Next.js y mantené los comandos por defecto.
3. Cargá las variables de entorno correspondientes al proyecto.
4. Desplegá y revisá los logs de build y runtime.
5. Después del despliegue, ejecutá la lista de comprobaciones de abajo.

Los cambios fusionados a la rama principal disparan el despliegue automático si la integración Git de Vercel está activa.

## Comprobaciones de producción

- La portada, `/radios`, `/paises` y `/categorias` cargan.
- `/sitemap.xml` y `/robots.txt` responden correctamente.
- No aparecen emisoras DEMO.
- `/admin` redirige al login sin sesión.
- Con una cuenta autorizada, revisar el panel y crear/probar contenido solo con datos controlados.
- Probar reproducción con una emisora cuyo uso esté autorizado y confirmar que el audio persiste al navegar.
- Verificar una URL oficial HTTPS válida desde el panel y comprobar que aparece en la ficha pública.
- Verificar que una URL HTTP o con certificado inválido no se expone como sitio oficial.
- Cambiar la URL oficial y confirmar que la verificación anterior se invalida.
- Confirmar que el formulario público funciona solo cuando Turnstile está configurado correctamente.
- Revisar `/privacidad` y `/terminos` con un profesional legal; siguen siendo borradores.

## Actualizaciones y mantenimiento

Antes de cambios de esquema: backup, prueba en staging/local y revisión de las migraciones pendientes. Para el mantenimiento recurrente, ver [MAINTENANCE.md](MAINTENANCE.md).


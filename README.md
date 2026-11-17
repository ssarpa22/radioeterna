# Radio Eterna

Directorio internacional de radios cristianas y evangélicas con reproducción en vivo. Interfaz pública en español. *Una plataforma desarrollada por Lazo Sur.*

## Estado actual

Radio Eterna está desplegada en [radioeterna.vercel.app](https://radioeterna.vercel.app). El proyecto incluye el directorio público, fichas de emisoras, reproductor persistente, panel de administración, importador de radios y herramientas de verificación. El estado de pruebas, limitaciones y tareas pendientes se mantiene en [docs/STATUS.md](docs/STATUS.md).

## Qué hace

Radio Eterna **no aloja ni retransmite el audio**: almacena fichas y enlaces de emisoras; el navegador del oyente se conecta directamente al servidor de cada radio. Las emisoras importadas o recibidas como solicitudes ingresan como borradores y requieren revisión antes de publicarse.

## Tecnología

- Next.js 15 (App Router), React 19 y TypeScript.
- Tailwind CSS 3 y lucide-react.
- Supabase: PostgreSQL, Auth y Row Level Security (RLS).
- Zod, hls.js y Vitest.

## Arquitectura

`src/app/` contiene rutas públicas, administración y API; `src/components/` contiene la interfaz; `src/lib/` concentra acceso a datos, validación, seguridad y clientes Supabase.

- Las Server Actions administrativas verifican sesión y rol en el servidor.
- La base usa RLS, restricciones de publicación y auditoría mediante triggers.
- El reproductor utiliza una única instancia de audio persistente al navegar.
- Las verificaciones de streams y sitios web oficiales son independientes.
- Un sitio oficial solo se muestra cuando su conexión HTTPS fue verificada explícitamente. Esa comprobación técnica no certifica que el contenido del sitio sea legítimo o seguro.

Más contexto: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/MAINTENANCE.md](docs/MAINTENANCE.md) y [docs/STATUS.md](docs/STATUS.md).

## Base de datos y migraciones

Las migraciones versionadas están en `supabase/migrations/` (actualmente `0001` a `0009`). Incluyen esquema, RLS, flujo administrativo, permisos de columnas públicas y verificación HTTPS de sitios oficiales.

La migración `0007_official_website_security.sql` agrega `stations.website_is_secure` y fue aplicada manualmente en producción. La migración `0008_website_verification_expiry.sql` agrega `stations.website_verified_at`. La migración `0009_website_monitoring_events.sql` crea el historial privado de verificaciones automáticas. Aplicá únicamente las migraciones pendientes. La comprobación HTTPS vence a los 30 días y, hasta volver a verificar, el enlace oficial permanece oculto. Al trabajar con otra base, revisá el historial y aplicá únicamente las migraciones pendientes. No ejecutes migraciones a ciegas sobre una base existente.

`supabase/seed.sql` contiene datos DEMO para desarrollo local: **no ejecutarlo en producción**.

## Requisitos y desarrollo local

Requisitos: Node.js 20 o superior, npm, Docker y Supabase CLI.

```bash
npm ci
cp .env.example .env.local
supabase start
npm run dev
```

Configurá en `.env.local` los valores locales de Supabase que imprime `supabase start`. Para validar cambios:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Variables de entorno

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de Supabase, protegida por RLS |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Clave pública de Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY` | Clave privada para validar Turnstile en el servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo endpoint privado del monitor; únicamente en Vercel/server-side |
| `WEBSITE_MONITOR_SECRET` | Autenticación del monitor automático; también como GitHub Actions secret |
| `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` | Rate limiting distribuido, si está configurado |

En producción, Turnstile debe tener configuradas ambas claves; si falta la configuración, el formulario público rechaza envíos. No agregues claves privadas al código ni al repositorio. La clave `SUPABASE_SERVICE_ROLE_KEY` nunca debe exponerse al cliente ni guardarse en el repositorio; solo la usa el endpoint privado de monitoreo.

## Panel de administración

- `/admin/login`: acceso administrativo.
- `/admin/radios`: gestión y revisión de emisoras.
- `/admin/importar`: importador para superadministradores.

Las emisoras importadas se guardan como borradores; verificá los datos y el stream antes de publicarlas. La acción para verificar el sitio oficial comprueba HTTPS/TLS y redirecciones con protección SSRF. Si cambia la URL oficial, la verificación debe repetirse.

## API pública

La API es de solo lectura y expone emisoras publicadas:

- `GET /api/stations`: listado con búsqueda, filtros, paginación y orden.
- `GET /api/stations/:slug`: ficha pública de una emisora.

Las operaciones administrativas se realizan mediante Server Actions protegidas, no mediante una API REST administrativa.

## Despliegue y mantenimiento

La guía de despliegue está en [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) y las tareas operativas/backups en [docs/MAINTENANCE.md](docs/MAINTENANCE.md). No se deben contratar servicios ni cambiar planes sin evaluar antes los costos y requisitos.

## Limitaciones conocidas

- La verificación HTTPS vence a los 30 días. El monitoreo automático diario de sitios oficiales se ejecuta con GitHub Actions una vez configurados los secretos y aplicada la migración 0009; no garantiza el contenido del sitio.
- No hay backups automáticos ni alertas por correo; las incidencias del monitor de sitios oficiales quedan en GitHub Actions y Supabase.
- Los streams pueden dejar de funcionar; HLS depende también de la configuración CORS de cada emisora.
- Las páginas legales son borradores pendientes de revisión profesional.


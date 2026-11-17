# Radio Eterna

Directorio internacional de radios cristianas y evangélicas con reproductor en vivo. Interfaz pública en español. *Una plataforma desarrollada por Lazo Sur.*

> **Estado:** aplicación desplegada en producción y en evolución. La CI valida TypeScript, ESLint, tests y build; las pruebas de navegador de producción son de solo lectura. Consulta `docs/STATUS.md` para conocer qué está verificado y qué sigue pendiente.

## 1. Qué es
Radio Eterna **no aloja audio**: guarda fichas de radios y sus enlaces de transmisión; el navegador del oyente se conecta directamente a cada emisora. Incluye directorio público, fichas individuales, reproductor persistente, panel de administración, formulario de solicitudes e importador de borradores.

## 2. Tecnología
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3 · Supabase (Postgres, Auth, RLS) · Zod · hls.js · lucide-react · Vitest.

## 3. Arquitectura
`src/app/` rutas → `src/components/` UI → `src/lib/data/` acceso a datos → `src/lib/validation/` Zod → `src/lib/supabase/` clientes → Postgres (migraciones + RLS).
- **Seguridad en la base:** RLS, permisos por columna para lecturas públicas, restricción de publicación y auditoría por triggers.
- **Server Actions** para el panel y el formulario público; la aplicación no necesita la clave service-role.
- **Flujo editorial:** solicitud enviada → revisión/verificación → publicación. Las radios importadas se crean como borradores.
- **Reproductor:** un único elemento de audio en el layout raíz; la reproducción puede continuar al navegar.
- **Sitios oficiales:** el enlace externo solo se muestra tras una comprobación HTTPS explícita desde administración. La comprobación no garantiza que el contenido sea benigno ni sustituye futuras reverificaciones.

## 4. Estructura
```
src/app/             rutas públicas, /admin y /api
src/components/      UI, reproductor, formularios y administración
src/lib/             datos, validación, seguridad, Supabase, auth y rate limit
supabase/migrations/ migraciones SQL numeradas
supabase/seed.sql    datos DEMO solo para desarrollo local
tests/               pruebas automatizadas
docs/                arquitectura, despliegue, mantenimiento y estado
```

## 5. Base de datos
Tablas principales: `stations`, `countries`, `categories`, `station_categories`, `station_submissions`, `station_status_logs`, `favorites`, `site_settings`, `audit_logs` y `admin_profiles`. El esquema y sus cambios están versionados en `supabase/migrations/`.

## 6. Instalación y desarrollo local
Requisitos: Node.js 20+, Docker y Supabase CLI.
```bash
npm ci
cp .env.example .env.local
supabase start
npm run dev
```
Configura en `.env.local` las variables locales que muestra Supabase y las demás indicadas en `.env.example`. Para reconstruir la base local desde cero, revisa primero las notas de migraciones en `docs/DEPLOYMENT.md`; `supabase db reset` también carga `seed.sql` con radios DEMO.

## 7. Variables de entorno
| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL pública de la aplicación. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anon/publishable protegida por RLS. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limiting distribuido; opcional, con fallback limitado por instancia. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile; ambas necesarias para habilitar solicitudes públicas en producción. |
| `SUPABASE_SERVICE_ROLE_KEY` | No es necesaria para el flujo actual; no la expongas al navegador. |

## 8. Supabase y migraciones
Las migraciones SQL están en `supabase/migrations/`. En producción, aplica cambios de esquema de forma controlada: revisa el SQL, haz backup cuando corresponda y prueba primero en un proyecto local o staging. **No ejecutes `seed.sql` en producción.** Algunas migraciones requieren validación previa o pueden haber sido aplicadas manualmente desde SQL Editor; consulta `docs/DEPLOYMENT.md` antes de usar `supabase db push` para evitar repetir cambios ya aplicados.

## 9. Primer administrador
Consulta `docs/ADMIN-SETUP.md`.

## 10. Comprobaciones locales
```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## 11. Despliegue
Consulta `docs/DEPLOYMENT.md` para entornos, variables, migraciones y lista de comprobación de producción.

## 12. API pública (solo lectura)
- `GET /api/stations`: listado público con búsqueda, filtros, paginación y orden.
- `GET /api/stations/:slug`: ficha de una radio publicada.
- Las operaciones administrativas se realizan mediante Server Actions protegidas por sesión y rol; no forman parte de la API pública.

## 13. Mantenimiento y limitaciones
Consulta `docs/MAINTENANCE.md` para backups y mantenimiento. Aún quedan tareas de auditoría RLS, pruebas E2E funcionales, CSP, rendimiento, reverificación automática de webs y validación sistemática de streams. Las páginas legales `/privacidad` y `/terminos` siguen siendo borradores pendientes de revisión profesional.

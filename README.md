# Radio Eterna

Directorio internacional de radios cristianas y evangélicas con reproductor en vivo. Interfaz pública en español. *Una plataforma desarrollada por Lazo Sur.*

> **Estado:** el código está completo hasta la Fase 4 pero **no se ha construido ni ejecutado** con Next.js ni contra un Postgres real. Lee `docs/STATUS.md` antes de confiar en cualquier función.

## 1. Qué es
Radio Eterna **no aloja audio**: guarda fichas de radios y sus enlaces de transmisión; el navegador del oyente se conecta directo a cada radio. Incluye directorio público, panel de administración, formulario de solicitudes y verificador de enlaces.

## 2. Tecnología
Next.js 15 (App Router) · React 19 · TypeScript estricto · Tailwind CSS 3 · Supabase (Postgres, Auth, RLS) · Zod · hls.js · lucide-react · Vitest. Sin shadcn/ui, Framer Motion ni React Hook Form (ver `docs/STATUS.md`).

## 3. Arquitectura
`app/` rutas → `components/` UI → `lib/data/` acceso a datos → `lib/validation/` Zod → `lib/supabase/` clientes → Postgres (migraciones + RLS).
- **Seguridad en la base:** RLS, restricción de publicación (solo radios verificadas) y auditoría por *triggers*.
- **Server Actions** para el panel y el formulario público; **ninguna usa la service-role key**.
- **Tres estados distintos:** solicitud *enviada* → radio *verificada* → radio *publicada*.
- **Reproductor:** un único `<audio>` en el layout raíz (no se corta al navegar). Decisiones y supuestos: `docs/ARCHITECTURE.md`, `docs/PHASE2-NOTES.md`, `docs/PHASE3-NOTES.md`.

## 4. Estructura de carpetas
```
src/app/            rutas públicas, /admin, /api
src/components/     UI, player/, forms/, admin/
src/lib/            data/, validation/, security/ (SSRF, verificador), supabase/, auth, rate-limit, api
supabase/migrations 0001–0005 (esquema, RLS, datos de referencia, conteos, flujo admin)
supabase/seed.sql   solo desarrollo local (radios DEMO)
tests/              pruebas Vitest
docs/               arquitectura, notas por fase, despliegue, mantenimiento, estado
```

## 5. Base de datos
Tablas: `stations`, `countries`, `categories`, `station_categories`, `station_submissions`, `station_status_logs`, `favorites`, `site_settings`, `audit_logs`, `admin_profiles`. Borrado lógico (`deleted_at`), `content_type` para futuros podcasts/sermones, `is_demo` para datos de ejemplo (ocultos salvo `allow_demo_data=true`). Detalle en `supabase/migrations/`.

## 6. Instalación
Requisitos: Node 20+ (probado el diseño con 22), Docker, Supabase CLI. 
```
npm install
cp .env.example .env.local
```

## 7. Variables de entorno
| Variable | Visible en el navegador | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | sí | URL pública (`http://localhost:3000` en local). |
| `NEXT_PUBLIC_SUPABASE_URL` | sí | URL de la API de Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sí | Clave anónima (protegida por RLS). |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | no | Límites de solicitudes fiables (opcional; sin ellos, memoria por instancia). |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | site key sí / secret no | Anti-spam (opcional; sin secret la verificación se omite). |
| `SUPABASE_SERVICE_ROLE_KEY` | no | **No se usa.** No la configures. |

## 8–9. Supabase y migraciones
Local: `supabase start` (aplica `0001`–`0005`) y `supabase db reset` (además carga `seed.sql` con radios DEMO). Copia a `.env.local` la *API URL* y la *anon key* que imprime `supabase start`. Producción: ver `docs/DEPLOYMENT.md`.

## 10. Crear el primer administrador
`docs/ADMIN-SETUP.md`.

## 11. Desarrollo local
```
npm run dev          # http://localhost:3000
npm run typecheck && npm run lint && npm test && npm run build
```

## 12. Despliegue en producción
`docs/DEPLOYMENT.md`: dominio, DNS, HTTPS, Supabase, variables, migraciones, primer admin, despliegue, pruebas y actualización.

## 13. API pública (solo lectura)
Respuestas: éxito `{ "data": …, "meta": … }`; error `{ "error": { "code", "message" } }`. Límite: 120 solicitudes/min por IP (`429` + `Retry-After`). Solo radios publicadas.

**`GET /api/stations`** — parámetros opcionales: `q` (nombre, máx. 80), `pais` (slug), `categoria` (slug), `pagina` (≥1), `limite` (1–60, por defecto 20), `orden` (`name` | `recent`), `destacadas=true`. Valores inválidos vuelven al valor por defecto. Respuesta `200`: `data` = lista de radios (`id, slug, name, short_description, city, logo_url, stream_url, stream_format, is_featured, verification_status, published_at, country_name, country_slug, category_name, category_slug`), `meta` = `{ total, page, page_size }`.

**`GET /api/stations/:slug`** — `200` con `data` = ficha pública (`id, slug, name, short_description, description, city, language, stream_url, stream_format, logo_url, website_url, social_links, is_featured, verified, published_at, country{name,slug}, category{name,slug}`); `404 not_found` si no existe o no está publicada; `500 internal_error`.

Operaciones de administración (crear/editar/publicar/verificar, solicitudes, categorías, países, configuración) **no** son una API REST: son Server Actions protegidas por sesión y rol (`src/app/admin/actions.ts`). Esto es una decisión de diseño; si necesitas una API administrativa para terceros, debe añadirse aparte.

## 14–15. Backups y mantenimiento
`docs/MAINTENANCE.md`. **Ningún backup ni monitoreo está configurado todavía.** Supabase Free no incluye backups automáticos.

## 16. Limitaciones conocidas
`docs/STATUS.md` (implementado / parcial / requiere configuración / limitaciones / hallazgos de seguridad).

## 17. Servicios externos y costos
Supabase (gratis → 25 USD/mes con backups y sin pausa), Vercel (Hobby es solo no comercial → Pro 20 USD/mes), dominio (~10–15 USD/año, estimación), Upstash y Turnstile (capa gratuita). Tabla y escenarios con fuentes en `docs/DEPLOYMENT.md`. No se contrata nada sin tu aprobación.

## Legal
`/privacidad` y `/terminos` son **borradores pendientes de revisión profesional**. El audio y las marcas pertenecen a cada radio; Radio Eterna no los aloja ni retransmite.

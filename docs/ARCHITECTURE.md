# Radio Eterna · Arquitectura (Fase 1)

## Decisiones clave
| Decisión | Motivo |
|---|---|
| **No alojamos audio.** El navegador se conecta directo a la URL de cada radio. | Costo de ancho de banda = 0, sin responsabilidad de retransmisión. |
| Next.js (App Router) + Supabase (Postgres, Auth, Storage) | Un solo despliegue, RLS nativo, capa gratuita suficiente para 30–50 radios. |
| **RLS como fuente de seguridad**, no solo código de app | Aunque se filtre un bug de UI, la base no entrega datos no publicados. |
| Búsqueda vía función SQL `search_stations` (SECURITY INVOKER) | Paginación y filtros en el servidor, aplica RLS, una sola consulta por listado. |
| `stations.content_type` (radio/podcast/sermon/program/video) | Permite ampliar a otros medios sin rediseñar. Hoy solo se usa `radio`. |
| Borrado lógico (`deleted_at`) + estado `archived` | Evita pérdida accidental de datos. |
| Registros DEMO (`is_demo`) ocultos por RLS salvo `allow_demo_data=true` | Los datos de ejemplo no pueden aparecer en producción. `seed.sql` solo corre en local. |
| Envíos públicos: INSERT anónimo solo como `pending`; lectura solo staff | Nada se publica sin revisión. |
| Cliente service-role aislado en `lib/supabase/admin.ts` (`server-only`) | Nunca llega al navegador. |

## Capas
`app/` (rutas) → `components/` (UI) → `lib/data/` (acceso a datos) → `lib/validation/` (Zod) → `lib/supabase/` (clientes) → Postgres (migraciones + RLS). `lib/security/` contiene la defensa SSRF.

## Roles
`super_admin` (todo, gestiona admins) · `admin` (catálogo, ajustes, solicitudes) · `editor` (crear/editar radios, revisar solicitudes).

## Costos (a verificar antes de contratar; son estimaciones, no consulté precios vigentes)
| Servicio | Desarrollo | Producción inicial | Cuándo se paga |
|---|---|---|---|
| Supabase | Gratis (local con CLI/Docker) | Plan gratuito | Backups diarios, sin pausa por inactividad y más recursos requieren plan de pago |
| Vercel | Gratis (Hobby) | Hobby es para uso no comercial; un negocio probablemente requiera Pro | Al monetizar el sitio |
| Dominio radioeterna.com | — | Aprox. 10–15 USD/año | Al registrarlo (requiere tu aprobación) |
| Upstash Redis / Cloudflare Turnstile | Gratis | Capa gratuita | Solo con mucho tráfico |
Alternativa de menor costo: Cloudflare Pages/Workers u hospedaje propio en VPS, con más trabajo de operación.

## Estado de la Fase 1
Hecho: migraciones 0001–0003, RLS, RPC de búsqueda, datos de referencia (9 categorías, 21 países), semilla DEMO, clientes Supabase, middleware de /admin, esquemas Zod, capa de datos, guardia de IPs SSRF, pruebas unitarias.
No verificado: nada se ha ejecutado (sin red en este entorno). Las migraciones no se han aplicado a un Postgres real.

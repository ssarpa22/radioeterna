# Estado del proyecto

**Importante:** el código se escribió sin poder ejecutar Next.js, Supabase ni el navegador. «Implementado» significa *escrito y revisado*, no *probado de punta a punta*. Lo que sí se ejecutó está en «Pruebas».

## Criterios de aceptación (sección 22 de la especificación)
| # | Criterio | Estado |
|---|---|---|
| 1–3 | Explorar, buscar/filtrar, fichas de radio | Implementado, sin ejecutar |
| 4–5 | Escuchar streams; el reproductor persiste al navegar | Implementado, **sin probar con streams reales** |
| 6–7 | Enviar solicitudes y guardarlas | Implementado, sin ejecutar |
| 8–11 | Login admin, CRUD de radios, aprobar/rechazar, categorías y países | Implementado, sin ejecutar |
| 12 | Datos del panel desde la base real | Implementado (consultas reales, sin datos de ejemplo) |
| 13 | Políticas de seguridad | RLS y triggers escritos; **migraciones nunca aplicadas a un Postgres** |
| 14 | Build de producción exitoso | **No verificado** |
| 15 | Documentado y listo para desplegar | Documentado; despliegue no realizado |

## Implementado por completo (código)
Directorio, búsqueda, filtros, paginación, fichas, países, categorías, favoritas (en el navegador), reproductor persistente con HLS, formulario de solicitud con honeypot/límites/Turnstile, panel (resumen, radios, solicitudes, categorías, países, configuración), verificador anti-SSRF, auditoría por triggers, flujo enviada → verificada → publicada, API pública de solo lectura, SEO técnico (metadatos, canónicas, sitemap, robots, JSON-LD), páginas de contacto/privacidad/términos (borrador).

## Parcial
- **Configuración del sitio:** se guarda en la base; solo el correo de contacto se usa públicamente (en `/contacto` y en la política de privacidad). Nombre, descripción y redes no se leen aún en el encabezado/pie.
- **Rendimiento:** páginas dinámicas, sin caché de datos (la API envía `Cache-Control` pero no se verificó con la CDN). Logos con `<img>`, no `next/image`.
- **Tests:** ver abajo.
- **Legal:** borradores con marcadores `[Completar…]`; requieren revisión profesional.

## Requiere configuración externa
Proyecto Supabase y migraciones, primer administrador, variables de entorno, Upstash (límites fiables), Turnstile, dominio/DNS, correo de contacto en el panel, cuenta de Vercel (plan Pro para uso comercial).

## Pruebas
**Ejecutadas (con un ejecutor sustituto de vitest, y TypeScript estricto solo sobre módulos independientes de Next):** verificador de streams contra servidores locales (redirecciones, bucles, timeout, HTML disfrazado de audio, HLS, 403, bloqueo de IPs privadas), guardia de IP, esquemas Zod, slug, API.
**Por ejecutar en tu máquina:** `npm run typecheck && npm run lint && npm test && npm run build`.
**No escritas (la especificación las pide):** pruebas de navegador/E2E (navegación, formularios, login, rutas protegidas, flujo de solicitudes, reproductor y errores de stream) y pruebas de RLS contra Postgres real. Recomendado: Playwright y pruebas SQL (pgTAP o scripts con `supabase start`). Hasta entonces, usa la lista manual de `DEPLOYMENT.md`.

## Desviaciones deliberadas de la especificación
- **shadcn/ui, Framer Motion y React Hook Form no se usan**: se construyó un sistema de diseño propio con Tailwind y formularios con Server Actions, para evitar dependencias (no se tocó `package.json`).
- **Zod** valida entradas; el rate limiting usa Upstash vía API REST (sin SDK).

## Hallazgos de seguridad pendientes
1. **Columnas visibles para lectores anónimos.** RLS filtra filas, no columnas: la API de Supabase con la clave anónima puede leer `last_verification_result` y `is_demo` de radios publicadas. Impacto bajo, pero puede incluir el nombre del administrador que verificó manualmente. Propuesta (no aplicada) en `docs/proposed/0006_column_privileges.sql`, con advertencias.
2. **Sin Content-Security-Policy.** Hay cabeceras básicas (`nosniff`, `X-Frame-Options`, etc.). Una CSP debe permitir `media-src` hacia hosts arbitrarios de streams y Turnstile; no se añadió por no poder probarla.
3. **Límites en memoria** si no se configura Upstash.
4. **Verificación SHOUTcast v1** puede fallar por el formato de respuesta; usar verificación manual.
5. Cualquier cuenta de Supabase Auth creada sin fila en `admin_profiles` no tiene acceso al panel, pero desactiva el registro público igualmente.

## Limitaciones conocidas
Sin subida de logos; sin gestión de administradores desde la interfaz; sin correos; sin reverificación automática; sin favoritas sincronizadas; sin metadatos «ahora suena»; streams `http` pueden bloquearse en sitios `https`; HLS depende de CORS de cada radio; sin podcasts/sermones (la columna `content_type` prepara la arquitectura).

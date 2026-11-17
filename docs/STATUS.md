# Estado del proyecto

Última actualización: 2026-11-17.

## Estado verificado

| Área | Estado |
|---|---|
| CI en GitHub Actions | TypeScript, ESLint, Vitest y build de producción aprobados en ejecuciones recientes de CI en `main`. |
| Tests unitarios | 60 tests en 6 archivos, según el último registro documentado de CI; confirmar el conteo en ejecuciones posteriores. |
| Playwright smoke | 11 pruebas aprobadas contra producción en el último registro documentado. Son de solo lectura. |
| Rutas públicas | Portada, directorio, países, categorías, favoritas, sumar radio, contacto, privacidad y términos respondieron HTTP 200 en la última revisión documentada. |
| Fichas de radios | El fallo 404 por compatibilidad con la columna `website_is_secure` fue corregido en PR #18 y el usuario confirmó que las fichas vuelven a abrir. |
| Migración 0007 | El usuario confirmó su ejecución en Supabase SQL Editor y que la consulta de comprobación devolvió la columna esperada. |
| Verificación de sitios oficiales | Implementada en administración; falta completar una prueba funcional guiada con radios representativas. |
| Supabase / RLS en producción | No auditado de punta a punta. |
| Reproductor y streams reales | No validados sistemáticamente. |
| Carga y rendimiento | No medidos con k6/Lighthouse. |

Los smoke tests de Playwright no inician sesión, no envían formularios ni escriben en la base de datos. No equivalen a pruebas funcionales completas.

## Funcionalidad implementada

Directorio, búsqueda, filtros, paginación, fichas, países, categorías, favoritas locales, reproductor persistente con HLS, formulario público de solicitudes, panel administrativo, verificación de streams, verificación HTTPS de webs oficiales, auditoría por triggers, flujo de revisión/publicación, importador de radios como borradores, API pública y SEO técnico.

## Pendientes prioritarios

1. **Auditoría de dependencias:** volver a ejecutar `npm audit` sobre el lockfile actual y revisar las cadenas transitivas afectadas. No asumir que una alerta antigua sigue vigente ni aplicar `npm audit fix --force`; mantener Next.js 15 y validar cualquier actualización con CI.
2. **Migración 0006 / permisos públicos:** confirmar su estado real en Supabase y validar en una base local las páginas públicas, `search_stations()`, conteos y API antes de aplicarla en producción si aún estuviera pendiente.
3. **Historial de migraciones:** algunas modificaciones pueden haberse aplicado desde SQL Editor. Antes de usar `supabase db push`, comparar el historial CLI con el esquema real y reconciliar cualquier migración aplicada manualmente; no repetir SQL a ciegas.
4. **Pruebas RLS:** ejecutar pruebas con Supabase local para anon, authenticated y staff, incluyendo solicitudes, aprobación, rechazo y CRUD.
5. **E2E funcional:** añadir pruebas aisladas para formularios, login, permisos, flujo de solicitudes, verificación de sitios oficiales y reproducción. No automatizar escrituras contra producción.
6. **CSP:** diseñar e introducir una Content-Security-Policy en modo report-only primero. Debe contemplar Supabase, Turnstile y orígenes externos de streams.
7. **Rendimiento:** incorporar Lighthouse y pruebas de carga moderadas en staging, nunca lanzar estrés contra producción.
8. **Reverificación de sitios oficiales:** hoy la marca de seguridad no tiene vencimiento automático. Diseñar una expiración y reverificación programada antes de confiar indefinidamente en una comprobación antigua.

## Configuración externa y operación

La aplicación requiere Supabase, variables de entorno y un primer administrador. En producción, Turnstile debe tener configuradas `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY` para habilitar el formulario público. Upstash permite rate limiting distribuido; sin él, el límite por memoria no se comparte entre instancias.

## Limitaciones conocidas

Sin subida de logos, gestión de administradores desde interfaz, correos transaccionales, reverificación automática, favoritas sincronizadas ni metadatos de reproducción. Streams HTTP pueden ser bloqueados desde sitios HTTPS y HLS depende de CORS de cada emisora. La verificación HTTPS confirma el transporte y el certificado en el momento de la comprobación, no la seguridad del contenido. Las páginas legales son borradores y requieren revisión profesional.

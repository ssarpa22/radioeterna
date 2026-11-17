# Estado del proyecto

Última actualización: 2026-11-17.

## Estado verificado

| Área | Estado |
|---|---|
| CI en GitHub Actions | TypeScript, ESLint, Vitest y build de producción aprobados en `main` |
| Tests unitarios | 60 tests aprobados en 6 archivos (ejecución registrada en CI) |
| Playwright smoke | 11 pruebas aprobadas contra `https://radioeterna.vercel.app` |
| Rutas públicas | Portada, directorio, países, categorías, favoritas, sumar radio, contacto, privacidad y términos responden HTTP 200 |
| SEO básico | `robots.txt` y `sitemap.xml` responden HTTP 200 |
| Protección básica del panel | `/admin` redirige al login sin sesión |
| Supabase / RLS en producción | No auditado de punta a punta |
| Reproductor y streams reales | No validados sistemáticamente |
| Carga y rendimiento | No medidos con k6/Lighthouse |

Los smoke tests de Playwright son de solo lectura: no inician sesión, no envían formularios ni escriben en la base de datos. No equivalen a pruebas funcionales completas.

## Funcionalidad implementada

Directorio, búsqueda, filtros, paginación, fichas, países, categorías, favoritas locales, reproductor persistente con HLS, formulario público de solicitud, panel administrativo, verificador de streams, auditoría por triggers, flujo de revisión/publicación, API pública, SEO técnico y páginas informativas.

## Pendientes prioritarios

1. **Dependencias:** el árbol instalado requiere actualización. La versión declarada originalmente de Next.js (15.0.3) es antigua y está afectada por avisos de seguridad posteriores. Actualizar Next.js y React a versiones corregidas, regenerando `package-lock.json` con npm y pasando CI; no editar el lockfile manualmente ni usar `npm audit fix --force`.
2. **Permisos por columna en Supabase:** aplicar `0006_public_station_columns.sql` solo después de probar en una base local las páginas públicas, `search_stations()`, los conteos y la API. La migración restringe el rol `anon`; no cambia filas ni datos.
3. **Pruebas RLS:** ejecutar pruebas con Supabase local para anon, authenticated y staff, incluyendo solicitudes, aprobación, rechazo y CRUD.
4. **E2E funcional:** añadir pruebas aisladas para formularios, login, permisos, flujo de solicitudes y reproducción. No automatizar escrituras contra producción.
5. **CSP:** diseñar e introducir una Content-Security-Policy en modo report-only primero. Debe contemplar Supabase, Turnstile y orígenes externos de streams.
6. **Rendimiento:** incorporar Lighthouse y pruebas de carga moderadas en staging, nunca lanzar estrés contra producción.

## Configuración externa y operación

Requiere Supabase y migraciones aplicadas, primer administrador, variables de entorno, Upstash para rate limiting distribuido, Turnstile, dominio/DNS y correo de contacto. No publicar claves service-role en cliente ni en repositorio.

## Limitaciones conocidas

Sin subida de logos, gestión de administradores desde interfaz, correos transaccionales, reverificación automática, favoritas sincronizadas ni metadatos de reproducción. Streams HTTP pueden ser bloqueados desde sitios HTTPS y HLS depende de CORS de cada emisora. Las páginas legales son borradores y requieren revisión profesional.

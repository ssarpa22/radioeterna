# Estado del proyecto

Última actualización: 2026-11-17.

Este documento distingue lo que está implementado, lo que se ha comprobado y lo que todavía requiere pruebas o configuración. Un check de CI no equivale a una auditoría funcional de producción.

## Estado verificado

| Área | Estado |
|---|---|
| CI en GitHub Actions | TypeScript, ESLint, Vitest y build de producción aprobados en ejecuciones recientes de CI |
| Tests unitarios | 60 tests aprobados en 6 archivos en la última ejecución documentada |
| Playwright smoke | 11 pruebas de solo lectura aprobadas contra producción en la última ejecución documentada |
| Rutas públicas básicas | Portada, directorio, países, categorías, favoritas, sumar radio, contacto, privacidad y términos respondieron HTTP 200 en la última comprobación documentada |
| SEO básico | `robots.txt` y `sitemap.xml` respondieron HTTP 200 |
| Protección básica del panel | `/admin` redirige al login sin sesión |
| Fichas de radios | Se corrigió el error 404 causado por la consulta de la nueva columna; el usuario confirmó que las fichas volvieron a funcionar |
| Migración 0007 | El usuario confirmó que agregó `stations.website_is_secure` en Supabase mediante SQL Editor |
| Verificación de webs oficiales | Probada manualmente en producción: el panel confirmó una URL HTTPS válida |
| Supabase / RLS en producción | No auditado de punta a punta |
| Reproductor y streams reales | No validados sistemáticamente |
| Carga y rendimiento | No medidos con k6/Lighthouse |

Los smoke tests de Playwright son de solo lectura: no inician sesión, no envían formularios ni escriben en la base de datos. No equivalen a pruebas funcionales completas.

## Funcionalidad implementada

- Directorio público con búsqueda, filtros, países, categorías, paginación y fichas.
- Favoritas locales y reproductor persistente con soporte HLS.
- Formulario público de solicitudes y flujo administrativo de revisión, verificación y publicación.
- Panel de administración y auditoría mediante triggers.
- Importador de Radio Browser para superadministradores; importa como borrador y no publica automáticamente.
- Verificador de streams con defensas SSRF.
- Verificador de sitios oficiales: exige HTTPS válido, controla redirecciones y protege las conexiones contra SSRF. El enlace oficial permanece oculto hasta una verificación explícita.
- API pública de solo lectura y SEO técnico.

## Pendientes prioritarios

1. **Pruebas funcionales de administración y RLS:** ejecutar pruebas aisladas con Supabase local para anon, authenticated y staff; cubrir solicitudes, aprobación, rechazo, CRUD y permisos. No automatizar escrituras contra producción.
2. **Prueba manual del sitio oficial:** desde el panel, verificar una URL HTTPS válida; confirmar que el sitio aparece en la ficha pública. Probar también una URL HTTP o inválida y confirmar que permanece oculta. Si se modifica la URL, verificar que el estado seguro se invalida.
3. **Vigencia de la verificación:** implementar fecha de verificación y vencimiento a los 30 días; el enlace debe ocultarse automáticamente al vencer y requerir una nueva comprobación manual.
4. **Content-Security-Policy:** diseñar e introducir CSP en modo report-only primero. Debe contemplar Supabase, Turnstile y orígenes externos de streams.
5. **Rendimiento:** incorporar Lighthouse y pruebas de carga moderadas en staging, nunca lanzar estrés contra producción.
6. **Dependencias:** revisar periódicamente `npm outdated` y `npm audit`; actualizar en ramas separadas, regenerar el lockfile con npm y ejecutar typecheck, lint, tests y build. Mantener Next.js 15 salvo decisión explícita de migrar de versión mayor.

## Configuración externa y operación

La aplicación necesita variables de entorno válidas de Supabase y un administrador inicial. En producción, Turnstile requiere `NEXT_PUBLIC_TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY`; sin ambas, los envíos públicos se rechazan. Upstash es recomendable para rate limiting distribuido, pero no se debe asumir que está configurado.

No publicar claves service-role en el cliente ni en el repositorio. La aplicación no necesita `SUPABASE_SERVICE_ROLE_KEY`.

## Limitaciones conocidas

- Sin subida de logos ni gestión de administradores desde interfaz.
- Sin correos transaccionales ni notificaciones automáticas.
- Favoritas guardadas localmente, no sincronizadas entre dispositivos.
- Sin metadatos avanzados de reproducción.
- No hay reverificación automática de streams ni de sitios oficiales; los sitios oficiales dejan de mostrarse 30 días después de su última verificación correcta.
- La verificación HTTPS confirma TLS y redirecciones en el momento de la prueba; no certifica que el contenido externo sea confiable ni que no cambie después.
- Streams HTTP pueden ser bloqueados desde páginas HTTPS y HLS depende del CORS de cada emisora.
- Las páginas legales son borradores y requieren revisión profesional.

## Seguridad operativa

- No ejecutar pruebas de carga ni flujos que escriban datos contra producción.
- Antes de aplicar migraciones nuevas, hacer backup y probarlas en staging/local.
- Revisar logs de Vercel y Supabase ante errores.
- Seguir `docs/MAINTENANCE.md` para backups y mantenimiento.

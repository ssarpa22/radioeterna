# Despliegue de Radio Eterna

Esta guía describe el despliegue y mantenimiento. Antes de ejecutar cambios en producción, revisa el estado real de la base y haz backup cuando corresponda. **No compres ni contrates servicios sin decidirlo tú.**

## Arquitectura y servicios

| Función | Servicio | Notas |
|---|---|---|
| Aplicación Next.js | Vercel | Requiere runtime Node. |
| Base de datos y autenticación | Supabase | Postgres + Auth + RLS. |
| Dominio y DNS | Registrador / Vercel | Configura los registros que indique Vercel. |
| HTTPS | Vercel | Certificado gestionado por Vercel. |
| Anti-spam | Cloudflare Turnstile | En producción se requieren site key y secret. |
| Rate limiting distribuido | Upstash Redis | Opcional; sin él, el fallback por memoria no se comparte entre instancias. |
| Correo transaccional | No implementado | No hay notificaciones transaccionales configuradas. |

## Entornos

- **Local:** Supabase local con Docker y la CLI.
- **Staging:** proyecto Supabase separado y entorno Preview de Vercel.
- **Producción:** proyecto Supabase real y entorno Production.

No compartas claves entre entornos. No uses la base de producción para pruebas que escriban o borren datos.

## Variables de entorno

En Vercel → Settings → Environment Variables, configura por entorno:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- Opcionales: `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`

La aplicación no necesita `SUPABASE_SERVICE_ROLE_KEY`; no la agregues por rutina ni la expongas al cliente. En producción, si faltan las claves de Turnstile, el formulario de solicitudes queda deshabilitado por diseño.

## Migraciones de Supabase

Las migraciones están versionadas en `supabase/migrations/`, actualmente hasta `0007_official_website_security.sql`.

**Importante:** el SQL ejecutado directamente desde Supabase SQL Editor puede modificar el esquema sin registrar esa migración en el historial de Supabase CLI. Antes de ejecutar `supabase db push`:

1. Ejecuta `supabase migration list` con el proyecto vinculado.
2. Compara el historial remoto con los archivos de `supabase/migrations/` y con el esquema real.
3. Si una migración se aplicó manualmente, reconcilia su registro mediante el procedimiento oficial de Supabase CLI, después de comprobar exactamente qué se ejecutó.
4. No ejecutes otra vez una migración solo porque la CLI la muestre pendiente: podría fallar o repetir cambios.
5. Prueba migraciones nuevas en local/staging, revisa el SQL y haz backup antes de producción.

La migración `0006_public_station_columns.sql` restringe permisos de lectura anónima por columna y su propio encabezado exige validación local previa. No la apliques a producción sin esa validación. La migración `0007_official_website_security.sql` agrega `stations.website_is_secure`; en este proyecto fue aplicada manualmente desde SQL Editor y comprobada por el usuario. Verifica su estado en el historial antes de futuras operaciones CLI.

**Nunca ejecutes `supabase/seed.sql` en producción:** contiene radios DEMO.

## Despliegue de la aplicación

1. Confirma que la rama principal tiene los checks de CI aprobados.
2. Verifica las variables de entorno del proyecto y entorno correcto en Vercel.
3. Fusiona el PR revisado; Vercel debería desplegar automáticamente desde la rama configurada.
4. Comprueba el resultado del deployment y sus logs antes de darlo por finalizado.

## Lista de comprobación de producción

- Portada, `/radios`, `/paises`, `/categorias`, `/sitemap.xml` y `/robots.txt` responden correctamente.
- No aparecen radios DEMO.
- `/admin` redirige al login sin sesión.
- Con una sesión autorizada, verifica un sitio oficial HTTPS válido desde administración y confirma que el enlace aparece en la ficha pública.
- Comprueba que un sitio HTTP o con certificado inválido no se presenta como sitio oficial verificado.
- Prueba el reproductor con una emisora autorizada; navega a otra página y confirma que el audio continúa.
- Verifica que el formulario público solo se habilite cuando Turnstile esté configurado.
- Revisa logs de Vercel y Supabase ante cualquier error.
- Revisa `/privacidad` y `/terminos` con un profesional legal: siguen siendo borradores.

## Costos y planes

Los planes y precios cambian. Consulta las páginas oficiales de Vercel, Supabase, Cloudflare y Upstash antes de contratar. Vercel Hobby tiene restricciones de uso comercial; confirma que el plan elegido sea adecuado para el uso previsto. Supabase Free no ofrece backups automáticos equivalentes a los planes pagos: conserva exportaciones propias y verifica periódicamente que puedas restaurarlas.

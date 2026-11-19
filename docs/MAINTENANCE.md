# Mantenimiento

**Estado real:** los backups siguen siendo una tarea manual según el plan de Supabase. El monitoreo diario de sitios oficiales se implementa mediante GitHub Actions, Vercel y Supabase; requiere configurar los secretos indicados en `DEPLOYMENT.md`.

## Backups
- **Supabase Free:** sin backups automáticos. Haz uno manual con regularidad: `supabase db dump --linked -f backup-AAAA-MM-DD.sql` (y `--data-only` si quieres solo datos). Guárdalo fuera de tu computadora principal.
- **Supabase Pro (25 USD/mes):** backups diarios con 7 días de retención; recuperación a un punto en el tiempo es un complemento de pago.
- Aun con Pro, conserva un volcado propio antes de cada migración importante.

## Exportar datos de radios
En SQL Editor: `copy (select s.name, s.slug, c.name as pais, s.stream_url, s.status from stations s join countries c on c.id=s.country_id where s.deleted_at is null) to stdout with csv header;` o usa el botón *Export to CSV* de Table Editor.

## Restaurar
1. Crea un proyecto nuevo (o usa una base local). 2. `psql "<cadena de conexión>" -f backup.sql`. 3. Reasigna variables de entorno si cambió el proyecto. 4. Verifica con la lista de pruebas de `DEPLOYMENT.md`. Prueba este procedimiento **una vez** antes de necesitarlo.

## Dependencias
Cada mes: `npm outdated`; revisa avisos de seguridad (`npm audit`) y actualiza en una rama, probando con `npm run typecheck && npm run lint && npm test && npm run build`. Next.js y Supabase publican parches de seguridad con frecuencia.

## Errores y registros
Vercel → Logs (aplicación) y Supabase → Logs (base de datos/Auth). Los errores de servidor se escriben con `console.error`. No hay herramienta de alertas integrada; una opción gratuita a evaluar es Sentry (no incluida).

## Revisión periódica de radios
Los enlaces de transmisión cambian o caen. Reverifica radios desde el panel (hoy es manual, una por una); automatizarlo es una mejora futura.

## Dominio, SSL y credenciales
- **Dominio:** anota la fecha de renovación y activa renovación automática en tu registrador.
- **SSL:** Vercel lo renueva solo; si cambias el DNS, revisa que siga válido.
- **Credenciales:** guarda contraseñas en un gestor; rota la contraseña de la base y las claves de Turnstile/Upstash si se filtran; usa cuentas de administrador personales (no compartidas) y desactiva (`is_active=false`) a quien salga del equipo.

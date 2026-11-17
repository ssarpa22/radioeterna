# Fase 3 · Decisiones, supuestos y límites

## Tres estados distintos
| Estado | Dónde vive | Significado |
|---|---|---|
| **Enviada** | `station_submissions.status = pending` | Alguien la solicitó. No es una radio todavía. |
| **Verificada** | `stations.verification_status` (`verified` / `manual`) | El enlace fue comprobado (automática o manualmente). |
| **Publicada** | `stations.status = published` | Visible al público. |
Aprobar una solicitud crea una radio en **borrador y sin verificar**. Publicar exige verificación y la regla vive en un *trigger* de Postgres (migración 0005), no solo en la interfaz. Cambiar el `stream_url` de una radio publicada la devuelve a «sin verificar / en revisión».

## Seguridad
- **Ninguna acción usa la service-role key.** Todo corre con la sesión del usuario y RLS. `lib/supabase/admin.ts` (Fase 1) queda sin uso.
- Cada página y acción empieza con `requireStaff()` (valida la sesión con Supabase Auth y exige perfil activo). El middleware es solo una primera barrera.
- Server Actions de Next incluyen comprobación de origen (CSRF). Roles: ver `ADMIN-SETUP.md`.
- **Auditoría por triggers** (`audit_logs`): insert/update/delete en radios, categorías, países, solicitudes, configuración y perfiles, con el usuario (`auth.uid()`). No se puede omitir desde el código de la app. Las verificaciones y cambios de estado quedan registrados por el mismo mecanismo; además `station_status_logs` guarda el historial de estados.
- **SSRF** (`lib/security/verify-stream.ts`): solo http/https, sin credenciales en la URL, resuelve DNS y exige que TODAS las IP sean públicas, **fija la IP** validada en la conexión (anti DNS-rebinding), revalida en cada redirección (máx. 5), timeout total, lectura limitada a 8 KB, concurrencia máx. 3 por instancia y 20 verificaciones/min por usuario.
- Formulario público: validación Zod en el servidor, honeypot, límite 5 envíos/hora por IP, Turnstile opcional, INSERT anónimo solo como `pending` (RLS).

## Qué significa «verificada»
`audio_detected` se basa en los **primeros bytes** (firma MP3/AAC/Ogg o lista HLS con `#EXT-X-`), no solo en `Content-Type`. Aun así **no garantiza** reproducción en todos los navegadores (CORS en HLS, http en sitios https). Siempre existe «Marcar verificada a mano».

## Supuestos a revisar
1. **Rate limit sin Upstash = memoria por instancia**: en serverless es débil. Configura Upstash (gratis) antes de producción. El cliente Upstash usa la API REST con `EXPIRE … NX` (requiere Redis ≥ 7); **no probado contra Upstash real**.
2. **Turnstile**: si `TURNSTILE_SECRET_KEY` no está definido la comprobación se omite (para desarrollo). En producción debe definirse. No probado contra Cloudflare real.
3. Servidores **SHOUTcast v1** responden `ICY 200 OK`, que el parser HTTP de Node puede rechazar → saldrá «respuesta no estándar»; usar verificación manual. No probado con un servidor real.
4. Otro detalle: el verificador envía `Icy-MetaData: 0` y un User-Agent propio; algunos proveedores bloquean bots (403/429) → verificación manual.
5. Edición de radio: la sincronización de categorías adicionales son 2 consultas (no atómicas). Si falla la segunda, se avisa.
6. Si hay un error de validación en el formulario de radio, las casillas de categorías adicionales vuelven al valor guardado (los demás campos conservan lo escrito).
7. El panel hereda el encabezado/pie público (sin layout propio). Es una decisión de simplicidad.
8. Los logos de solicitudes se copian como URL externa al borrador; revisar derechos antes de publicar.

## No implementado en esta fase (declarado)
- Subida de logos (solo URL). Gestión de administradores desde la interfaz (solo SQL). Notificaciones por correo. Estadísticas por rango de fechas. Conectar `site_settings` al encabezado/pie públicos. Páginas `/contacto`, `/privacidad`, `/terminos` (Fase 4).

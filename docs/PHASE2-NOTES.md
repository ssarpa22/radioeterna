# Fase 2 · Decisiones y supuestos a revisar

## Sistema de diseño
Tokens en `tailwind.config.ts` + clases reutilizables en `globals.css` (`.btn`, `.field`, `.label`, `.chip`, `.badge`, `.wrap`) y componentes en `components/ui.tsx` (SectionHeading, EmptyState, PageHeader). El formulario de solicitud y el panel admin deben usar solo estas piezas.
Tipografías: Fraunces (títulos) + Hanken Grotesk (texto), vía `next/font/google` (se descargan en el build y se sirven desde tu dominio).

## Reproductor
- Un único `<audio>` creado en `PlayerProvider` (layout raíz) → no se interrumpe al navegar.
- Cambio de radio: `release()` pausa, destruye hls.js, quita `src` y llama `load()` (libera la conexión) antes de iniciar la nueva. Un `token` descarta respuestas asíncronas de la radio anterior.
- HLS: soporte nativo (Safari/iOS) si existe; si no, `hls.js` se carga bajo demanda solo para `.m3u8`.
- Nunca hay autoplay: `play()` solo se invoca desde un clic.
- Reanudar una radio en vivo = reconectar (no hay "seek").
- Media Session API: controles en pantalla de bloqueo/auriculares.
**Supuestos a revisar**
1. Streams `http://` desde un sitio `https://` pueden ser bloqueados por el navegador (contenido mixto). El reproductor lo detecta y avisa, pero no hay solución del lado cliente. Opciones futuras: exigir https al aprobar radios, o mostrar "Escuchar en el sitio oficial".
2. CORS: `<audio>` no requiere CORS para reproducir, pero hls.js sí (usa XHR/fetch). Muchos `.m3u8` ajenos pueden fallar por CORS; el error se muestra como "no se pudo reproducir".
3. Metadatos ICY ("ahora suena") no están implementados.

## Datos y rendimiento
- Las páginas son dinámicas (usan cookies de sesión de Supabase). Es correcto y simple; en Fase 4 se puede añadir un cliente sin cookies + `unstable_cache` para listados públicos.
- Conteos por país/categoría: migración `0004` (RPC `SECURITY INVOKER`).
- Logos: `<img>` simple con respaldo de iniciales porque el origen de logos es arbitrario. Plan: subirlos a Supabase Storage y usar `next/image`.

## SEO
- Metadatos únicos, canónicas, `sitemap.xml` y `robots.txt` dinámicos, JSON-LD `RadioStation` en cada ficha.
- `/radios` con filtros o paginación → `noindex,follow`. País/categoría sin radios → `noindex` y fuera del sitemap.

## Pendiente / enlaces que aún no funcionan
- El botón "Solicitar inclusión" de la portada apunta a `/sumar-radio` (se construye en la Fase 3; hasta entonces da 404).
- `/contacto`, `/privacidad`, `/terminos`: Fase 3/4. No están en el menú ni en el pie.
- Favoritas: solo en este navegador (localStorage). Sincronizar con la tabla `favorites` requiere cuentas de usuario (no planificado aún).

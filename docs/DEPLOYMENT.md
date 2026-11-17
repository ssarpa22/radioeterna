# Despliegue de Radio Eterna

> Nada de esto se ha ejecutado todavía: son los pasos previstos. **No compres ni contrates nada sin decidirlo tú.**

## Arquitectura y quién hace qué
| Función | Servicio sugerido | Notas |
|---|---|---|
| Aplicación (Next.js) | Vercel | El hosting compartido tradicional **no** sirve: Next necesita runtime Node. |
| Base de datos, Auth, Storage | Supabase | Postgres + RLS. |
| Registro del dominio | Registrador a elección | Solo registra el nombre. |
| DNS | Registrador o Vercel | Apunta el dominio a Vercel. |
| SSL/HTTPS | Vercel (automático) | Certificado gestionado por Vercel. |
| Anti-spam / límites | Cloudflare Turnstile, Upstash Redis | Opcionales, tienen capa gratuita. |
| Correo | **No implementado** | No hay notificaciones por correo todavía. |

## Costos (consultados en noviembre de 2026; confirma en las páginas oficiales antes de contratar)
| Servicio | Plan | Costo | Lo que importa |
|---|---|---|---|
| Supabase | Free | 0 USD | 500 MB de base de datos, 1 GB de archivos, ~5 GB de transferencia; **el proyecto se pausa tras 1 semana sin actividad** y **no incluye backups automáticos**. |
| Supabase | Pro | desde 25 USD/mes | Sin pausa; backups diarios con 7 días de retención (recuperación a un punto en el tiempo es un extra de pago). |
| Vercel | Hobby | 0 USD | **Solo uso personal y no comercial.** Un sitio de negocio no cumple. |
| Vercel | Pro | 20 USD/mes por usuario | Permite uso comercial. |
| Dominio radioeterna.com | — | ~10–15 USD/año (estimación, no verificada) | Renovación anual. |
| Turnstile / Upstash | Gratis | 0 USD | Capas gratuitas, no verificadas en esta revisión. |

Escenarios: **desarrollo** = 0 USD (Supabase local + Hobby para pruebas personales). **Lanzamiento mínimo** ≈ 20 USD/mes (Vercel Pro) + dominio, con Supabase Free y backups manuales. **Recomendado con tráfico real** ≈ 45 USD/mes (Vercel Pro + Supabase Pro) + dominio. El audio no pesa en tu factura: lo sirve cada radio.

## Entornos
Desarrollo: Supabase local (`supabase start`). Staging: un segundo proyecto de Supabase + el entorno *Preview* de Vercel. Producción: proyecto Supabase propio + entorno *Production*. **Nunca** compartas claves entre entornos.

## Pasos
1. **Dominio.** Regístralo (tú decides dónde). 
2. **DNS.** En Vercel: Project → Settings → Domains → agrega `radioeterna.com` y `www`. Vercel muestra los registros exactos (A/CNAME) que debes crear en tu DNS; usa **esos** valores, no otros. Propaga en minutos u horas.
3. **HTTPS.** Vercel emite y renueva el certificado solo cuando el DNS apunta bien. Verifica el candado en el navegador.
4. **Proyecto Supabase.** Crea el proyecto (elige región cercana a tus oyentes, guarda la contraseña de la base). En Authentication → URL Configuration: *Site URL* = `https://radioeterna.com`; agrega la URL de staging si tienes. En Providers → Email: **desactiva «Allow new users to sign up»**.
5. **Variables de entorno** (Vercel → Settings → Environment Variables, por entorno): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; opcionales `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`. **`SUPABASE_SERVICE_ROLE_KEY` no es necesaria** (la app no la usa): no la cargues. Antes de lanzar, define Upstash y Turnstile.
6. **Migraciones.** Con Supabase CLI: `supabase login`, `supabase link --project-ref <ref>`, `supabase db push` (aplica `0001`–`0005`). **No ejecutes `seed.sql` en producción** (son datos DEMO). Comprueba en SQL: `select value from site_settings where key='allow_demo_data';` → `false`.
7. **Primer administrador.** Sigue `docs/ADMIN-SETUP.md`.
8. **Despliegue.** Sube el repositorio a GitHub, impórtalo en Vercel (framework Next.js, sin cambiar comandos) y despliega. 
9. **Prueba en producción** (lista abajo).
10. **Actualizar.** `git push` a la rama principal despliega automáticamente. Si hay migraciones nuevas: primero pruébalas en staging, luego `supabase db push` en producción (haz un backup antes).

### Lista de pruebas en producción
- Portada, `/radios`, `/paises`, `/categorias` cargan; `/sitemap.xml` y `/robots.txt` responden.
- No aparece ninguna radio «DEMO».
- Inicia sesión en `/admin/login`; crea una radio, verifícala, publícala y ábrela en el sitio público.
- Pulsa «Escuchar» con una radio real **que tengas autorización para usar**; navega a otra página y confirma que el audio sigue.
- Envía una solicitud en `/sumar-radio`, ábrela en `/admin/solicitudes` y apruébala (queda en borrador).
- Prueba el reproductor con una radio `http://` y con una `https://`.
- Configura el correo en `/admin/configuracion` (lo usa `/contacto`).
- Revisa `/privacidad` y `/terminos` con un profesional legal y retira el aviso de «borrador».

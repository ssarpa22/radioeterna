# Crear el primer administrador (local o producción)

No hay registro público de administradores: una cuenta solo entra al panel si tiene una fila en `admin_profiles`.

1. En Supabase: **Authentication → Users → Add user** (correo + contraseña, marca "Auto confirm"). Local: Studio en http://localhost:54323.
2. En **SQL Editor**, ejecuta (cambia correo y nombre):
```sql
insert into admin_profiles (id, display_name, role)
select id, 'Tu nombre', 'super_admin' from auth.users where email = 'tu@correo.com';
```
3. Entra en `/admin/login`.
4. **Producción:** en Authentication → Providers → Email desactiva "Allow new users to sign up". Así nadie puede crear cuentas por su cuenta (aunque sin fila en `admin_profiles` no tendrían acceso).

Roles: `editor` (radios y solicitudes, sin eliminar) · `admin` (+ categorías, países, configuración, eliminar) · `super_admin` (+ gestionar administradores, solo vía SQL por ahora).

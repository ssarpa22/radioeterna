'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStaff } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { loginSchema } from '@/lib/validation/admin-schemas';
import { formToObject, type FormState } from '@/lib/form';

export async function loginAction(_p: FormState, fd: FormData): Promise<FormState> {
  const ip = await clientIp();
  if (!(await rateLimit(`login:${ip}`, 10, 600))) return { ok: false, message: 'Demasiados intentos. Espera 10 minutos.' };
  const p = loginSchema.safeParse(formToObject(fd));
  if (!p.success) return { ok: false, message: 'Ingresa tu correo y contraseña.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(p.data);
  if (error) return { ok: false, message: 'Correo o contraseña incorrectos.' };       // same message for every failure (no user enumeration)
  if (!(await getStaff())) { await supabase.auth.signOut(); return { ok: false, message: 'Esta cuenta no tiene acceso al panel.' }; }
  redirect('/admin');
}

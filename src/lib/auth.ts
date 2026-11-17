import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type Role = 'super_admin' | 'admin' | 'editor';
export type Staff = { id: string; email: string | undefined; name: string; role: Role };

/** Validates the session with Supabase Auth (getUser, not the cookie alone) and loads the staff profile (RLS: self-read). */
export async function getStaff(): Promise<Staff | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('admin_profiles').select('display_name, role, is_active').eq('id', user.id).maybeSingle();
  if (!data || !data.is_active) return null;
  return { id: user.id, email: user.email, name: data.display_name, role: data.role as Role };
}

/** Call at the top of EVERY admin page and server action: middleware alone is not authorization. */
export async function requireStaff(min: 'editor' | 'admin' = 'editor'): Promise<Staff> {
  const s = await getStaff();
  if (!s) redirect('/admin/login');
  if (min === 'admin' && s.role === 'editor') redirect('/admin?acceso=denegado');
  return s;
}

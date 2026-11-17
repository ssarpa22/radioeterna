'use server';
import { createClient } from '@/lib/supabase/server';
import { submissionSchema } from '@/lib/validation/schemas';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';
import { formToObject, invalid, type FormState } from '@/lib/form';

export async function submitStation(_prev: FormState, fd: FormData): Promise<FormState> {
  const ip = await clientIp();
  if (!(await rateLimit(`submit:${ip}`, 5, 3600))) return { ok: false, message: 'Enviaste varias solicitudes seguidas. Intenta de nuevo en una hora.' };

  const raw = formToObject(fd);
  if (typeof raw.website === 'string' && raw.website.trim() !== '') return { ok: true };   // honeypot: bots get a silent fake success
  raw.authorized_confirmed = raw.authorized_confirmed === 'on';

  const parsed = submissionSchema.safeParse(raw);
  if (!parsed.success) return invalid(fd, parsed.error.flatten().fieldErrors);
  if (!(await verifyTurnstile(raw['cf-turnstile-response'] as string | undefined, ip)))
    return { ok: false, message: 'No pudimos comprobar que eres una persona. Recarga la página e inténtalo otra vez.', values: invalid(fd, {}).values };

  const { website: _hp, authorized_confirmed, ...rest } = parsed.data;
  const supabase = await createClient();
  // Anonymous INSERT is allowed by RLS only as status 'pending'; the row cannot be read back by the public.
  const { error } = await supabase.from('station_submissions').insert({ ...rest, authorized_confirmed, status: 'pending' });
  if (error) {
    console.error('submitStation', error.code, error.message);
    return { ...invalid(fd, {}, 'No pudimos guardar tu solicitud. Intenta de nuevo más tarde.') };
  }
  return { ok: true };
}

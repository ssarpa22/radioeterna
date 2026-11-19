'use server';
// SECURITY MODEL: every action starts with requireStaff() (session validated by Supabase Auth + active profile),
// runs with the USER's session (RLS applies), and never uses the service-role key.
// The audit trail is written by database triggers (migration 0005), so it cannot be skipped from here.
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';
import { slugify } from '@/lib/slug';
import { verifyStream } from '@/lib/security/verify-stream';
import { formToObject, invalid, type CommandResult, type FormState } from '@/lib/form';
import { categoryInputSchema, countryInputSchema, settingsSchema, stationInputSchema, submissionEditSchema } from '@/lib/validation/admin-schemas';

type DbErr = { code?: string; message: string };
const dbError = (e: DbErr) => {
  if (e.code === '23505') return 'Ya existe un registro con ese nombre o enlace (slug).';
  if (e.code === '42501') return 'No tienes permiso para esta acción.';
  if (e.code === 'P0001') return e.message;            // our own Spanish messages raised inside Postgres
  console.error('admin action db error', e.code, e.message);
  return 'No se pudo completar la acción. Intenta de nuevo.';
};
const uuid = z.string().uuid();

export async function logoutAction() {
  const supabase = await createClient(); await supabase.auth.signOut(); redirect('/admin/login');
}

// ---------------- Stations ----------------
export async function saveStation(_p: FormState, fd: FormData): Promise<FormState> {
  await requireStaff();
  const parsed = stationInputSchema.safeParse(formToObject(fd));
  if (!parsed.success) return invalid(fd, parsed.error.flatten().fieldErrors);
  const d = parsed.data; const supabase = await createClient();
  const slug = d.slug ?? slugify(d.name);
  if (!slug) return invalid(fd, { name: ['No se pudo generar un enlace desde este nombre'] });
  const social = Object.fromEntries(Object.entries({ facebook: d.facebook, instagram: d.instagram, youtube: d.youtube, x: d.x }).filter(([, v]) => v));
  const row = { name: d.name, slug, short_description: d.short_description ?? null, description: d.description ?? null, country_id: d.country_id, city: d.city ?? null,
    primary_category_id: d.primary_category_id, language: d.language, stream_url: d.stream_url, logo_url: d.logo_url ?? null, website_url: d.website_url ?? null,
    social_links: social, display_order: d.display_order, ...(d.stream_format ? { stream_format: d.stream_format } : {}) };
  let id = d.id;
  if (id) {
    const { data: previous, error: previousError } = await supabase.from('stations').select('website_url').eq('id', id).maybeSingle();
    if (previousError || !previous) return invalid(fd, {}, 'No se pudo comprobar el sitio web anterior.');
    const websiteChanged = (previous.website_url ?? null) !== (d.website_url ?? null);
    const { data, error } = await supabase.from('stations').update({ ...row, ...(websiteChanged ? { website_is_secure: false, website_verified_at: null } : {}) }).eq('id', id).select('id');
    if (error) return invalid(fd, {}, dbError(error));
    if (!data?.length) return invalid(fd, {}, 'No se encontró la radio o no tienes permiso para editarla.');
  } else {
    const { data, error } = await supabase.from('stations').insert({ ...row, status: 'draft' }).select('id').single();
    if (error) return invalid(fd, {}, dbError(error));
    id = data.id as string;
  }
  // Not atomic with the station write (two statements); a failure here leaves the station saved with its previous extra categories.
  const del = await supabase.from('station_categories').delete().eq('station_id', id!);
  const extra = d.categories.filter((c) => c !== d.primary_category_id);
  const ins = extra.length && !del.error ? await supabase.from('station_categories').insert(extra.map((category_id) => ({ station_id: id!, category_id }))) : null;
  if (del.error || ins?.error) return invalid(fd, {}, 'La radio se guardó, pero no se pudieron actualizar las categorías adicionales.');
  revalidatePath('/admin/radios');
  if (!d.id) redirect(`/admin/radios/${id}`);
  return { ok: true, message: 'Cambios guardados. Si cambiaste el enlace de transmisión, debes verificarlo de nuevo antes de publicar.' };
}

export async function publishVerifiedStations(rawIds: string[]): Promise<CommandResult & { published?: number }> {
  const staff = await requireStaff('editor');
  if (!Array.isArray(rawIds) || rawIds.length === 0 || rawIds.length > 50) {
    return { ok: false, message: 'Seleccioná entre 1 y 50 radios.' };
  }
  const ids = [...new Set(rawIds)];
  if (ids.some((id) => !uuid.safeParse(id).success)) {
    return { ok: false, message: 'La selección contiene identificadores no válidos.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('stations')
    .update({ status: 'published' })
    .in('id', ids)
    .eq('status', 'draft')
    .in('verification_status', ['verified', 'manual'])
    .is('deleted_at', null)
    .select('id');

  if (error) return { ok: false, message: dbError(error) };
  const published = data?.length ?? 0;
  revalidatePath('/admin/radios');
  revalidatePath('/');
  return {
    ok: published > 0,
    published,
    message: published === ids.length
      ? `Se publicaron ${published} radios correctamente.`
      : `Se publicaron ${published} de ${ids.length}. Las demás no estaban en estado borrador o no tenían verificación válida.`,
  };
}

export type StationCommand = 'publish' | 'unpublish' | 'suspend' | 'archive' | 'restore' | 'feature' | 'unfeature' | 'verify' | 'verify_website' | 'verify_manual' | 'delete';
export async function stationCommand(id: string, cmd: StationCommand): Promise<CommandResult> {
  const staff = await requireStaff(cmd === 'delete' ? 'admin' : 'editor');
  if (!uuid.safeParse(id).success) return { ok: false, message: 'Identificador no válido.' };
  const supabase = await createClient();
  const update = async (patch: Record<string, unknown>, okMsg: string): Promise<CommandResult> => {
    const { data, error } = await supabase.from('stations').update(patch).eq('id', id).select('id');
    if (error) return { ok: false, message: dbError(error) };
    if (!data?.length) return { ok: false, message: 'No se encontró la radio o no tienes permiso.' };
    revalidatePath('/admin/radios'); return { ok: true, message: okMsg };
  };
  switch (cmd) {
    case 'publish': return update({ status: 'published' }, 'Radio publicada.');           // DB trigger refuses unless verified
    case 'unpublish': return update({ status: 'draft' }, 'Radio despublicada (borrador).');
    case 'suspend': return update({ status: 'suspended' }, 'Radio suspendida.');
    case 'archive': return update({ status: 'archived', is_featured: false }, 'Radio archivada.');
    case 'restore': return update({ status: 'draft', deleted_at: null }, 'Radio restaurada como borrador.');
    case 'feature': return update({ is_featured: true }, 'Radio destacada.');
    case 'unfeature': return update({ is_featured: false }, 'Radio ya no está destacada.');
    case 'delete': return update({ deleted_at: new Date().toISOString(), status: 'archived', is_featured: false }, 'Radio eliminada (se puede restaurar desde la base de datos).');
    case 'verify_manual': {
      const now = new Date().toISOString();
      return update({ verification_status: 'manual', last_verified_at: now, last_verification_result: { manual: true, verified_by: staff.name, checked_at: now } }, 'Marcada como verificada manualmente.');
    }
    case 'verify_website': {
      if (!(await rateLimit(`verify-website:${staff.id}`, 10, 60))) return { ok: false, message: 'Demasiadas verificaciones de sitios web. Espera un minuto.' };
      const { data: st } = await supabase.from('stations').select('website_url').eq('id', id).maybeSingle();
      if (!st?.website_url) return { ok: false, message: 'Esta radio no tiene un sitio web cargado.' };
      let url: URL;
      try { url = new URL(st.website_url as string); } catch { return { ok: false, message: 'La dirección del sitio web no es válida.' }; }
      if (url.protocol !== 'https:' || url.username || url.password) {
        await update({ website_is_secure: false, website_verified_at: null }, 'No se habilitó el sitio: debe usar HTTPS y no incluir credenciales.');
        return { ok: false, message: 'No se habilitó el sitio: debe usar HTTPS y no incluir credenciales.' };
      }
      const result = await verifyStream(url.toString(), { timeoutMs: 8_000 });
      const secure = result.reachable && !result.error && Boolean(result.final_url?.startsWith('https://'));
      const saved = await update({ website_is_secure: secure, website_verified_at: secure ? new Date().toISOString() : null }, secure
        ? 'Sitio web comprobado: respondió por HTTPS con un certificado válido. El botón ya puede mostrarse.'
        : `Sitio web no habilitado: ${result.error || result.notes[0] || 'no se pudo confirmar una conexión HTTPS válida'}`);
      return { ...saved, ok: saved.ok && secure };
    }
    case 'verify': {
      if (!(await rateLimit(`verify:${staff.id}`, 20, 60))) return { ok: false, message: 'Demasiadas verificaciones seguidas. Espera un minuto.' };
      const { data: st } = await supabase.from('stations').select('stream_url, verification_status').eq('id', id).maybeSingle();
      if (!st) return { ok: false, message: 'No se encontró la radio.' };
      const result = await verifyStream(st.stream_url as string);
      const status = result.audio_detected ? 'verified' : st.verification_status === 'manual' ? 'manual' : 'failed';
      const saved = await update({ last_verified_at: result.checked_at, last_verification_result: result, verification_status: status, ...(result.detected_format ? { stream_format: result.detected_format } : {}) },
        result.audio_detected ? 'Se detectó audio en el enlace.' : 'No se detectó audio en el enlace.');
      return { ...saved, ok: saved.ok && result.audio_detected, result };
    }
  }
}

// ---------------- Submissions ----------------
export async function saveSubmission(_p: FormState, fd: FormData): Promise<FormState> {
  await requireStaff();
  const raw = formToObject(fd); const id = uuid.safeParse(raw.id);
  if (!id.success) return invalid(fd, {}, 'Solicitud no válida.');
  const parsed = submissionEditSchema.safeParse(raw);
  if (!parsed.success) return invalid(fd, parsed.error.flatten().fieldErrors);
  const supabase = await createClient();
  const { logo_url, internal_notes, ...rest } = parsed.data;
  const { data, error } = await supabase.from('station_submissions').update({ ...rest, logo_url: logo_url ?? null, internal_notes: internal_notes ?? null }).eq('id', id.data).eq('status', 'pending').select('id');
  if (error) return invalid(fd, {}, dbError(error));
  if (!data?.length) return invalid(fd, {}, 'Solo se pueden editar solicitudes pendientes.');
  revalidatePath('/admin/solicitudes'); return { ok: true, message: 'Cambios guardados.' };
}

export async function submissionCommand(id: string, cmd: 'approve' | 'reject' | 'test', notes?: string): Promise<CommandResult> {
  const staff = await requireStaff();
  if (!uuid.safeParse(id).success) return { ok: false, message: 'Identificador no válido.' };
  const supabase = await createClient();
  if (cmd === 'approve') {
    const { data, error } = await supabase.rpc('approve_submission', { p_id: id });
    if (error) return { ok: false, message: dbError(error) };
    revalidatePath('/admin/solicitudes'); return { ok: true, message: 'Solicitud aprobada. Se creó una radio en borrador, aún sin verificar ni publicar.', id: data as string };
  }
  if (cmd === 'reject') {
    const { error } = await supabase.rpc('reject_submission', { p_id: id, p_notes: (notes ?? '').slice(0, 2000) });
    if (error) return { ok: false, message: dbError(error) };
    revalidatePath('/admin/solicitudes'); return { ok: true, message: 'Solicitud rechazada.' };
  }
  if (!(await rateLimit(`verify:${staff.id}`, 20, 60))) return { ok: false, message: 'Demasiadas verificaciones seguidas. Espera un minuto.' };
  const { data: sub } = await supabase.from('station_submissions').select('stream_url').eq('id', id).maybeSingle();
  if (!sub) return { ok: false, message: 'No se encontró la solicitud.' };
  const result = await verifyStream(sub.stream_url as string);    // not stored: a submission has no verification state
  return { ok: result.audio_detected, message: result.audio_detected ? 'Se detectó audio en el enlace.' : 'No se detectó audio en el enlace.', result };
}

// ---------------- Categories, countries, settings (admin role) ----------------
async function saveRef(table: 'categories' | 'countries', parsed: { id?: string; slug?: string; name: string } & Record<string, unknown>, fd: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { id, slug, ...rest } = parsed; const row = { ...rest, slug: slug ?? slugify(parsed.name) };
  const q = id ? supabase.from(table).update(row).eq('id', id).select('id') : supabase.from(table).insert(row).select('id');
  const { data, error } = await q;
  if (error) return invalid(fd, {}, dbError(error));
  if (!data?.length) return invalid(fd, {}, 'No se encontró el registro.');
  revalidatePath(`/admin/${table === 'categories' ? 'categorias' : 'paises'}`);
  return { ok: true, message: id ? 'Cambios guardados.' : 'Creado.' };
}
export async function saveCategory(_p: FormState, fd: FormData): Promise<FormState> {
  await requireStaff('admin');
  const p = categoryInputSchema.safeParse({ ...formToObject(fd), is_active: fd.has('is_active') });
  if (!p.success) return invalid(fd, p.error.flatten().fieldErrors);
  return saveRef('categories', { ...p.data, description: p.data.description ?? null }, fd);
}
export async function saveCountry(_p: FormState, fd: FormData): Promise<FormState> {
  await requireStaff('admin');
  const p = countryInputSchema.safeParse({ ...formToObject(fd), is_active: fd.has('is_active') });
  if (!p.success) return invalid(fd, p.error.flatten().fieldErrors);
  return saveRef('countries', p.data, fd);
}
export async function saveSettings(_p: FormState, fd: FormData): Promise<FormState> {
  await requireStaff('admin');
  const p = settingsSchema.safeParse(formToObject(fd));
  if (!p.success) return invalid(fd, p.error.flatten().fieldErrors);
  const d = p.data; const supabase = await createClient();
  const social = Object.fromEntries(Object.entries({ facebook: d.facebook, instagram: d.instagram, youtube: d.youtube, x: d.x }).filter(([, v]) => v));
  const rows = [['platform_name', d.platform_name], ['platform_description', d.platform_description ?? ''], ['contact_email', d.contact_email ?? ''], ['social_links', social]]
    .map(([key, value]) => ({ key, value, is_public: true }));
  const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' });
  if (error) return invalid(fd, {}, dbError(error));
  revalidatePath('/admin/configuracion'); return { ok: true, message: 'Configuración guardada.' };
}

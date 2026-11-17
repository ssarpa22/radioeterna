export const STATUS_LABEL: Record<string, string> = { draft: 'Borrador', pending_review: 'En revisión', published: 'Publicada', suspended: 'Suspendida', archived: 'Archivada' };
export const VERIFICATION_LABEL: Record<string, string> = { unverified: 'Sin verificar', verified: 'Verificada', failed: 'Falló', manual: 'Verificada a mano' };
export const SUBMISSION_LABEL: Record<string, string> = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' };
export const ACTION_LABEL: Record<string, string> = { insert: 'creó', update: 'modificó', delete: 'eliminó' };
export const ENTITY_LABEL: Record<string, string> = { stations: 'una radio', categories: 'una categoría', countries: 'un país', station_submissions: 'una solicitud', site_settings: 'la configuración', admin_profiles: 'un administrador' };
export const fmtDate = (iso: string | null | undefined) => iso ? new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—';

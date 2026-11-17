import { getStationBySlug } from '@/lib/data/stations';
import { apiError, apiOk, CACHE_PUBLIC, toPublicStation } from '@/lib/api';
import { apiSlugSchema } from '@/lib/validation/api-schemas';
import { clientIp, rateLimit } from '@/lib/rate-limit';

/** GET /api/stations/:slug */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await rateLimit(`api:${await clientIp()}`, 120, 60))) return apiError(429, 'rate_limited', 'Demasiadas solicitudes. Intenta de nuevo en un minuto.', { 'Retry-After': '60' });
  const slug = apiSlugSchema.safeParse((await params).slug);
  if (!slug.success) return apiError(404, 'not_found', 'Radio no encontrada.');
  try {
    const s = await getStationBySlug(slug.data);
    return s ? apiOk(toPublicStation(s), { cache: CACHE_PUBLIC }) : apiError(404, 'not_found', 'Radio no encontrada.');
  } catch (e) {
    console.error('GET /api/stations/[slug]', e);
    return apiError(500, 'internal_error', 'No se pudo obtener la radio.');
  }
}

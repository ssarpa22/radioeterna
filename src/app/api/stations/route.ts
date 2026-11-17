import { searchStations } from '@/lib/data/stations';
import { apiError, apiOk, CACHE_PUBLIC } from '@/lib/api';
import { apiStationsQuerySchema } from '@/lib/validation/api-schemas';
import { clientIp, rateLimit } from '@/lib/rate-limit';

/** GET /api/stations?q=&pais=&categoria=&pagina=&limite=&orden=name|recent&destacadas=true  (read-only, published stations only) */
export async function GET(req: Request) {
  if (!(await rateLimit(`api:${await clientIp()}`, 120, 60))) return apiError(429, 'rate_limited', 'Demasiadas solicitudes. Intenta de nuevo en un minuto.', { 'Retry-After': '60' });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const f = apiStationsQuerySchema.parse(sp);
  try {
    const r = await searchStations({ q: f.q, pais: f.pais, categoria: f.categoria, pagina: f.pagina, orden: f.orden, destacadas: f.destacadas ? true : undefined, limite: f.limite });
    return apiOk(r.items, { meta: { total: r.total, page: r.page, page_size: r.page_size }, cache: CACHE_PUBLIC });
  } catch (e) {
    console.error('GET /api/stations', e);
    return apiError(500, 'internal_error', 'No se pudo obtener el listado.');
  }
}

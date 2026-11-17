import { z } from 'zod';
import { stationSearchSchema } from './schemas';

/** Query string of GET /api/stations. Invalid values fall back to safe defaults instead of failing. */
export const apiStationsQuerySchema = stationSearchSchema.extend({
  limite: z.coerce.number().int().min(1).max(60).catch(20),
  destacadas: z.enum(['true']).optional().catch(undefined),
});
export const apiSlugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(120);

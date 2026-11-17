import { z } from 'zod';

const httpUrl = z.string().trim().url().max(2048).refine((u) => /^https?:\/\//i.test(u), 'Debe comenzar con http:// o https://');
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

export const stationSearchSchema = z.object({
  q: z.string().trim().max(80).optional().transform((v) => v || undefined),
  pais: slug.optional().catch(undefined),
  categoria: slug.optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(10_000).catch(1),
  orden: z.enum(['name', 'recent']).catch('name'),
});

export const submissionSchema = z.object({
  station_name: z.string().trim().min(2, 'Ingresa el nombre de la radio').max(120),
  country_id: z.string().uuid('Selecciona un país'),
  city: z.string().trim().min(2, 'Ingresa la ciudad').max(80),
  contact_name: z.string().trim().min(2, 'Ingresa tu nombre').max(120),
  contact_email: z.string().trim().toLowerCase().email('Correo electrónico no válido'),
  website_url: httpUrl,
  stream_url: httpUrl,
  primary_category_id: z.string().uuid('Selecciona una categoría'),
  description: z.string().trim().min(10, 'Describe brevemente la radio').max(2000),
  logo_url: httpUrl.optional().or(z.literal('').transform(() => undefined)),
  authorized_confirmed: z.literal(true, { error: 'Debes confirmar que estás autorizado' }),
  website: z.string().max(0).optional(), // honeypot: must stay empty
});
export type SubmissionInput = z.infer<typeof submissionSchema>;

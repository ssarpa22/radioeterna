import { z } from 'zod';
import { submissionSchema } from './schemas';

// Phase 3 admin schemas. Kept in their own file so Phase 2's schemas.ts is untouched.
const httpUrl = z.string().trim().url().max(2048).refine((u) => /^https?:\/\//i.test(u), 'Debe comenzar con http:// o https://');

const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);
const optUrl = z.string().trim().max(2048).optional().transform((v) => v || undefined)
  .refine((v) => v === undefined || /^https?:\/\/\S+$/i.test(v), 'Debe comenzar con http:// o https://');
const optId = z.string().uuid().optional().or(z.literal('').transform(() => undefined));
const order = z.coerce.number().int().min(-9999).max(9999).catch(0);
const uuidList = z.preprocess((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]), z.array(z.string().uuid()).max(12));

export const stationInputSchema = z.object({
  id: optId,
  name: z.string().trim().min(2, 'Ingresa el nombre').max(120),
  slug: z.string().trim().toLowerCase().max(80).optional().transform((v) => v || undefined)
    .refine((v) => v === undefined || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), 'Usa solo minúsculas, números y guiones'),
  short_description: optText(200), description: optText(5000),
  country_id: z.string().uuid('Selecciona un país'), city: optText(80),
  primary_category_id: z.string().uuid('Selecciona una categoría'), categories: uuidList,
  language: z.string().trim().min(2).max(8).catch('es'),
  stream_url: httpUrl,
  stream_format: z.enum(['mp3', 'aac', 'ogg', 'hls', 'unknown']).optional().or(z.literal('').transform(() => undefined)),
  logo_url: optUrl, website_url: optUrl,
  facebook: optUrl, instagram: optUrl, youtube: optUrl, x: optUrl,
  display_order: order,
});

export const categoryInputSchema = z.object({
  id: optId, name: z.string().trim().min(2, 'Ingresa el nombre').max(80),
  slug: z.string().trim().toLowerCase().max(80).optional().transform((v) => v || undefined)
    .refine((v) => v === undefined || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), 'Usa solo minúsculas, números y guiones'),
  description: optText(500), display_order: order, is_active: z.boolean(),
});
export const countryInputSchema = z.object({
  id: optId, code: z.string().trim().regex(/^[A-Za-z]{2}$/, 'Código de 2 letras').transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2, 'Ingresa el nombre').max(80),
  slug: z.string().trim().toLowerCase().max(80).optional().transform((v) => v || undefined)
    .refine((v) => v === undefined || /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v), 'Usa solo minúsculas, números y guiones'),
  display_order: order, is_active: z.boolean(),
});
export const settingsSchema = z.object({
  platform_name: z.string().trim().min(2).max(60), platform_description: optText(300),
  contact_email: z.string().trim().email('Correo no válido').optional().or(z.literal('').transform(() => undefined)),
  facebook: optUrl, instagram: optUrl, youtube: optUrl, x: optUrl,
});
export const submissionEditSchema = submissionSchema.pick({
  station_name: true, country_id: true, city: true, website_url: true, stream_url: true, primary_category_id: true, description: true,
}).extend({ logo_url: optUrl, internal_notes: optText(2000) });
export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

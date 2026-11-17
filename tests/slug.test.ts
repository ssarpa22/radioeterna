import { expect, it } from 'vitest';
import { slugify } from '@/lib/slug';
it('slugifies Spanish names', () => { expect(slugify('Radio Fe y Esperanza ¡En Vivo!')).toBe('radio-fe-y-esperanza-en-vivo'); expect(slugify('Año Nuevo')).toBe('ano-nuevo'); });

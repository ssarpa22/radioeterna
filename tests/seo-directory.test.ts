import { describe, expect, it } from 'vitest';
import { buildDirectoryItemList, getCategoryDescription, serializeJsonLd } from '@/lib/seo/directory';

describe('SEO directory structured data', () => {
  it('points directory items to their real station detail URLs', () => {
    const result = buildDirectoryItemList(
      [{ name: 'Radio de prueba', slug: 'radio-de-prueba' }],
      1,
    );

    expect(result.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Radio de prueba',
        url: 'http://localhost:3000/radios/radio-de-prueba',
      },
    ]);
    expect(result.numberOfItems).toBe(1);
  });

  it('uses an existing editorial category description when available', () => {
    expect(getCategoryDescription('gospel', 'Gospel', 'Descripción editorial')).toBe('Descripción editorial');
  });

  it('provides useful descriptions for the supported and future categories', () => {
    expect(getCategoryDescription('gospel', 'Gospel')).toContain('gospel');
    expect(getCategoryDescription('custom-category', 'Categoría nueva')).toContain('categoría nueva');
  });

  it('escapes less-than characters before embedding JSON-LD in HTML', () => {
    expect(serializeJsonLd({ name: '</script>' })).toBe('{"name":"\\u003c/script>"}');
  });
});

import { describe, expect, it } from 'vitest';
import { buildDirectoryItemList, getCategoryDescription, getDirectoryPageMetadata, serializeJsonLd } from '@/lib/seo/directory';

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

  it('gives paginated directory pages their own canonical URLs', () => {
    expect(getDirectoryPageMetadata('/paises/argentina', 1, 45, 20)).toEqual({
      canonical: '/paises/argentina',
      robots: undefined,
    });
    expect(getDirectoryPageMetadata('/paises/argentina', 2, 45, 20)).toEqual({
      canonical: '/paises/argentina?pagina=2',
      robots: undefined,
    });
  });

  it('keeps empty and out-of-range directory pages out of the index', () => {
    expect(getDirectoryPageMetadata('/categorias/gospel', 1, 0, 20).robots).toEqual({ index: false, follow: true });
    expect(getDirectoryPageMetadata('/categorias/gospel', 3, 45, 20).robots).toBeUndefined();
    expect(getDirectoryPageMetadata('/categorias/gospel', 4, 45, 20).robots).toEqual({ index: false, follow: true });
  });

  it('escapes less-than characters before embedding JSON-LD in HTML', () => {
    expect(serializeJsonLd({ name: '</script>' })).toBe('{"name":"\\u003c/script>"}');
  });
});

import { absoluteUrl } from '@/lib/site';

type DirectoryItem = { name: string; slug: string };

export function buildDirectoryItemList(items: DirectoryItem[], basePath: string, total: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: total,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(`${basePath}/${item.slug}`),
    })),
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

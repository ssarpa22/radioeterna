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
      url: `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? ''}${basePath}/${item.slug}`,
    })),
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

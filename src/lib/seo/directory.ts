import { absoluteUrl } from '@/lib/site';

type DirectoryItem = { name: string; slug: string };

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'musica-cristiana': 'Encuentra emisoras que transmiten música cristiana y canciones de fe para acompañarte durante el día.',
  'alabanza-y-adoracion': 'Escucha radios dedicadas a la alabanza y la adoración, con música para acompañar momentos de oración y encuentro espiritual.',
  gospel: 'Descubre emisoras gospel con música cristiana de raíces góspel, coros y propuestas contemporáneas.',
  'musica-cristiana-contemporanea': 'Explora radios de música cristiana contemporánea, con canciones y artistas actuales de la escena cristiana.',
  'musica-evangelica': 'Encuentra emisoras de música evangélica con canciones y contenidos de distintas comunidades y estilos.',
  'ensenanza-biblica': 'Escucha emisoras con enseñanza bíblica, estudios y espacios dedicados al aprendizaje de las Escrituras.',
  'predicacion-cristiana': 'Descubre radios con predicación cristiana, mensajes y reflexiones basados en la fe.',
  'programacion-cristiana': 'Explora emisoras con programación cristiana variada, que puede incluir música, mensajes y espacios de interés para la comunidad.',
  'radiodifusion-cristiana-general': 'Encuentra emisoras con programación cristiana general y una variedad de contenidos relacionados con la fe.',
};

export function getCategoryDescription(slug: string, name: string, existingDescription?: string | null): string {
  const editorialDescription = existingDescription?.trim();
  if (editorialDescription) return editorialDescription;

  return CATEGORY_DESCRIPTIONS[slug] ??
    `Explora emisoras de la categoría ${name.toLowerCase()} y escucha su transmisión en vivo desde Radio Eterna.`;
}

export function buildDirectoryItemList(items: DirectoryItem[], total: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: total,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(`/radios/${item.slug}`),
    })),
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export const SITE = {
  name: 'Radio Eterna',
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://radioeterna.vercel.app').replace(/\/$/, ''),
  description: 'Directorio de radios cristianas y evangélicas en vivo, de todo el mundo hispano. Escucha desde un solo lugar.',
  credit: 'Una plataforma desarrollada por Lazo Sur',
};
// Only routes that exist. Add /sumar-radio, /contacto, /privacidad, /terminos when built (Phase 3/4).
export const NAV = [
  { href: '/radios', label: 'Radios' },
  { href: '/paises', label: 'Países' },
  { href: '/categorias', label: 'Categorías' },
  { href: '/favoritas', label: 'Favoritas' },
  { href: '/sumar-radio', label: 'Suma tu radio' },
];
export const absoluteUrl = (path: string) => `${SITE.url}${path}`;
export const FOOTER_LINKS = [
  { href: '/contacto', label: 'Contacto' },
  { href: '/privacidad', label: 'Privacidad' },
  { href: '/terminos', label: 'Términos' },
];

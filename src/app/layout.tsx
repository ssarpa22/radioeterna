import type { Metadata, Viewport } from 'next';
import { Fraunces, Hanken_Grotesk } from 'next/font/google';
import './globals.css';
import { SITE } from '@/lib/site';
import { PlayerProvider } from '@/components/player/PlayerProvider';
import { PlayerBar } from '@/components/player/PlayerBar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

const display = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const sans = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: 'Radio Eterna · Radios cristianas y evangélicas en vivo', template: '%s · Radio Eterna' },
  description: SITE.description,
  openGraph: { type: 'website', siteName: SITE.name, locale: 'es_LA', title: SITE.name, description: SITE.description },
  twitter: { card: 'summary_large_image' },
};
export const viewport: Viewport = { themeColor: '#0A1730', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body>
        <PlayerProvider>
          <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">Saltar al contenido</a>
          <Header />
          <main id="contenido">{children}</main>
          <Footer />
          <PlayerBar />
        </PlayerProvider>
      </body>
    </html>
  );
}

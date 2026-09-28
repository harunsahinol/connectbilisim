import type { Metadata, Viewport } from 'next';
import { Archivo, Martian_Mono, Onest } from 'next/font/google';
import { LAYERS, layerCountWord } from '@/content/site';
import './globals.css';

// Başlıklar: Archivo, genişlik ekseni (wdth 62–125) dahil — açılıştaki "gerilme" animasyonu bu eksene dayanır
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  variable: '--font-archivo',
});

const onest = Onest({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-onest',
});

// Etiketler ve 3B sahnedeki bant yazıları
const martianMono = Martian_Mono({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  variable: '--font-martian',
});

export const metadata: Metadata = {
  title: 'Connect Bilişim — Kablodan yapay zekâya',
  description: `${LAYERS.map((l, i) => (i ? l.title.toLocaleLowerCase('tr') : l.title)).join(', ')}. ${layerCountWord} katman, tek ekip.`,
  openGraph: {
    title: 'Connect Bilişim — Kablodan yapay zekâya',
    description: `Ağdan yapay zekâya ${layerCountWord.toLocaleLowerCase('tr')} katman, tek ekip.`,
    locale: 'tr_TR',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#111316',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // "js" sınıfı aşağıdaki satır içi betikle hidrasyondan önce eklenir; uyumsuzluk uyarısı beklenen bir durum
    <html lang="tr" className={`${archivo.variable} ${onest.variable} ${martianMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

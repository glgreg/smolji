import type { Metadata } from 'next';
import { Bricolage_Grotesque, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Smolji — Turn Emojis into Layered PNG Stickers',
  description:
    'Convert and compose emojis across 11 visual styles into high-resolution transparent PNG stickers right in your browser.',
};

const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('smolji_theme');var m=document.querySelector('meta[name="color-scheme"]');var sys=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var t=(s==='light'||s==='dark')?s:sys;if(m&&(s==='light'||s==='dark')){m.setAttribute('content',s);}document.documentElement.classList.remove('light','dark');document.documentElement.classList.add(t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-[#F6F2EA] dark:bg-[#161513] text-[#1B1917] dark:text-[#F4EFE6] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

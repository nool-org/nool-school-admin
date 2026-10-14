import type { Metadata } from 'next';
import { Fredoka, Inter, Nunito, Plus_Jakarta_Sans } from 'next/font/google';

import { AuthProvider } from '@/lib/AuthProvider';
import { ToastProvider } from '@/components/Toast';
import { AppThemeProvider } from '@/lib/AppThemeProvider';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

// the noolAI app's faces: Nunito for text, Fredoka for headings (globals.css retouch layer)
const nunito = Nunito({ variable: '--font-nunito', subsets: ['latin'], weight: ['400', '500', '600'] });
const fredoka = Fredoka({ variable: '--font-fredoka', subsets: ['latin'], weight: ['500', '600'] });

// the noolAI logo only (BrandMark)
const brand = Plus_Jakarta_Sans({ variable: '--font-brand', subsets: ['latin'], weight: ['800'] });

export const metadata: Metadata = {
  title: 'Nool School Admin',
  description: 'School Admin console for noolAI - roster, classes, curriculum, and analytics.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${inter.variable} ${nunito.variable} ${fredoka.variable} ${brand.variable}`}>
      <body>
        <AppThemeProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}

import { Inter, Outfit } from 'next/font/google';
import Providers from '@/components/Providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const outfit = Outfit({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-outfit', display: 'swap' });

export const metadata = {
  title: { default: 'StudioPass', template: '%s · StudioPass' },
  description: 'Credit-based class booking for independent fitness & yoga studios.',
};

export const viewport = { themeColor: '#356f72' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

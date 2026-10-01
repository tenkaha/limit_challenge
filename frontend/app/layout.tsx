import { Box } from '@mui/material';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import NavBar from '@/components/nav-bar';
import Providers from './providers';

const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Fleet Tracker',
  description: 'Vehicles, offices, mechanics and maintenance history',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        {/* Collects emotion styles during SSR so server and client markup match. */}
        <AppRouterCacheProvider>
          <Providers>
            <NavBar />
            <Box component="main" sx={{ maxWidth: 1180, mx: 'auto', px: { xs: 2, sm: 4 }, py: 4 }}>
              {children}
            </Box>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}

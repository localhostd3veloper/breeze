import type { Metadata } from 'next';
import { Geist_Mono, Manrope } from 'next/font/google';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { GlobalShortcuts } from '@/components/global-shortcuts';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Breeze',
  description: 'Your personal AI assistant',
};

import Providers from '@/components/providers';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <GlobalShortcuts />
          <Providers>
            <TooltipProvider>{children}</TooltipProvider>
          </Providers>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}

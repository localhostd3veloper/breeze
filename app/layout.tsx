import { Analytics } from '@vercel/analytics/next';
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

const APP_NAME = 'Breeze';
const APP_DESCRIPTION =
  'Breeze is a fast, private AI chat assistant powered by self-hosted LLMs. Chat with powerful language models without sending data to the cloud.';
const APP_URL = process.env.NEXTAUTH_URL ?? 'https://breeze.local';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    'AI chat',
    'self-hosted LLM',
    'Ollama',
    'private AI assistant',
    'local AI',
    'open source chat',
  ],
  authors: [{ name: 'Breeze' }],
  creator: 'Breeze',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    url: APP_URL,
    siteName: APP_NAME,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [
      {
        url: '/breeze.svg',
        width: 512,
        height: 512,
        alt: 'Breeze logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: ['/breeze.svg'],
  },
};

import Providers from '@/components/providers';

import dbConnect from '@/lib/db/mongodb';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await dbConnect();
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <Analytics />
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

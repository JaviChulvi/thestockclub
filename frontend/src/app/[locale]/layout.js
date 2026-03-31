import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import "../globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";
import CanonicalURL from "@/components/CanonicalURL";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { generateLocalizedMetadata } from '@/lib/metadata';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  // Default metadata - individual pages will override this
  return generateLocalizedMetadata(locale, 'metadata.home', { path: '' });
}

export default async function LocaleLayout({ children, params }) {
  // Await the params to get the locale
  const { locale } = await params;
  
  // Validate that the incoming locale is valid
  if (!routing.locales.includes(locale)) {
    notFound();
  }
  
  // Providing all messages to the client side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        {/* Dynamic canonical and hreflang tags */}
        <CanonicalURL />
        {process.env.NODE_ENV === 'production' && (
          <>
            <Script
              async
              src="https://www.googletagmanager.com/gtag/js?id=G-FK1WYHLLLK"
            />
            <Script id="google-analytics">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-FK1WYHLLLK');
              `}
            </Script>
          </>
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-x-hidden`}
      >
        <NextIntlClientProvider messages={messages}>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

'use client';

import { usePathname } from 'next/navigation';

const baseUrl = 'https://thestock.club';

export default function CanonicalURL() {
  const pathname = usePathname();
  
  // Remove the locale prefix to get the base path
  const pathWithoutLocale = pathname.replace(/^\/(en|es)/, '') || '';
  
  // Build canonical URL (always use /en as the default)
  const canonicalUrl = `${baseUrl}/en${pathWithoutLocale}`;
  
  // Build alternate URLs
  const enUrl = `${baseUrl}/en${pathWithoutLocale}`;
  const esUrl = `${baseUrl}/es${pathWithoutLocale}`;
  
  return (
    <>
      {/* Canonical URL - always points to /en version as the default */}
      <link rel="canonical" href={canonicalUrl} />
      
      {/* hreflang tags for language alternatives */}
      <link rel="alternate" hrefLang="en" href={enUrl} />
      <link rel="alternate" hrefLang="es" href={esUrl} />
      <link rel="alternate" hrefLang="x-default" href={enUrl} />
    </>
  );
}


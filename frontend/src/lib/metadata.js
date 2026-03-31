import { getTranslations } from 'next-intl/server';

/**
 * Generates localized metadata for a page
 * @param {string} locale - The current locale (en, es)
 * @param {string} pageKey - The translation key for the page metadata (e.g., 'metadata.home')
 * @param {Object} params - Optional parameters for dynamic metadata
 * @returns {Promise<Object>} - Next.js metadata object
 */
export async function generateLocalizedMetadata(locale, pageKey, params = {}) {
  const t = await getTranslations({ locale, namespace: pageKey });

  const baseUrl = 'https://thestock.club';
  const localePath = locale === 'en' ? '/en' : '/es';

  return {
    title: t('title'),
    description: t('description'),
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `${baseUrl}${localePath}${params.path || ''}`,
      languages: {
        'en': `${baseUrl}/en${params.path || ''}`,
        'es': `${baseUrl}/es${params.path || ''}`,
      },
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: `${baseUrl}${localePath}${params.path || ''}`,
      siteName: 'The Stock Club',
      locale: locale === 'en' ? 'en_US' : 'es_ES',
      type: 'website',
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: t('title'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: [`${baseUrl}/og-image.png`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

/**
 * Generates dynamic metadata for pages with parameters (e.g., fund detail pages)
 * @param {string} locale - The current locale (en, es)
 * @param {string} pageKey - The translation key for the page metadata
 * @param {Object} dynamicData - Dynamic data to inject into metadata (including 'path' for URLs)
 * @returns {Promise<Object>} - Next.js metadata object
 */
export async function generateDynamicMetadata(locale, pageKey, dynamicData = {}) {
  const t = await getTranslations({ locale, namespace: pageKey });

  const baseUrl = 'https://thestock.club';
  const localePath = locale === 'en' ? '/en' : '/es';

  // Extract path from dynamicData (not needed for translation)
  const { path, ...translationParams } = dynamicData;

  // Pass dynamic values directly to the translation function
  const title = t('title', translationParams);
  const description = t('description', translationParams);

  return {
    title,
    description,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `${baseUrl}${localePath}${path || ''}`,
      languages: {
        'en': `${baseUrl}/en${path || ''}`,
        'es': `${baseUrl}/es${path || ''}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}${localePath}${path || ''}`,
      siteName: 'The Stock Club',
      locale: locale === 'en' ? 'en_US' : 'es_ES',
      type: 'website',
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/og-image.png`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

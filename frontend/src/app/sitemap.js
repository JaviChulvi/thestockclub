import { API_BASE_URL } from '@/config/api';

const FUNDS_PER_SITEMAP = 5000;
// Define sitemap segments: home, funds, benchmarks, managers
export async function generateSitemaps() {
  return [
    { id: 'home' },
    { id: 'funds' },
    { id: 'benchmarks' },
    { id: 'managers' }
  ];
}

// Fetch functions
async function getAllFundISINs() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/funds/sitemap/funds`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 604800 }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.isins || [];
  } catch (error) {
    console.error('Error fetching fund ISINs:', error);
    return [];
  }
}

async function getAllBenchmarkIds() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/benchmarks/sitemap`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 604800 }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.ids || [];
  } catch (error) {
    console.error('Error fetching benchmark IDs:', error);
    return [];
  }
}

async function getAllManagerIds() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/funds/managers/sitemap`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 604800 }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.ids || [];
  } catch (error) {
    console.error('Error fetching manager IDs:', error);
    return [];
  }
}

// Helper function to build alternates for a given path
function buildAlternates(baseUrl, pathWithoutLocale) {
  const path = pathWithoutLocale === '/' ? '' : pathWithoutLocale;
  return {
    languages: {
      en: `${baseUrl}/en${path}`,
      es: `${baseUrl}/es${path}`,
    },
  };
}

export default async function sitemap({ id }) {
  const baseUrl = 'https://thestock.club';
  const locales = ['en', 'es'];
  const now = new Date();
  const urls = [];

  if (id === 'home') {
    // Home pages
    for (const locale of locales) {
      urls.push({
        url: `${baseUrl}/${locale}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 1.0,
        alternates: buildAlternates(baseUrl, '/'),
      });
    }
  } else if (id.startsWith('funds')) {
    const segmentMatch = id.match(/funds-(\d+)/);

    if (segmentMatch) {
      const segmentNumber = parseInt(segmentMatch[1]);
      const fundISINs = await getAllFundISINs();

      const startIndex = segmentNumber * FUNDS_PER_SITEMAP;
      const endIndex = Math.min(startIndex + FUNDS_PER_SITEMAP, fundISINs.length);
      const segmentISINs = fundISINs.slice(startIndex, endIndex);

      // Funds
      for (const locale of locales) {
        // Fund list page
        urls.push({
          url: `${baseUrl}/${locale}/fund`,
          lastModified: now,
          changeFrequency: 'daily',
          priority: 0.9,
          alternates: buildAlternates(baseUrl, '/fund'),
        });
        // Individual fund pages
        for (const isin of segmentISINs) {
          urls.push({
            url: `${baseUrl}/${locale}/fund/${isin}`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.7,
            alternates: buildAlternates(baseUrl, `/fund/${isin}`),
          });
        }
      }
    }
  } else if (id === 'benchmarks') {
    // Benchmarks
    const benchmarkIds = await getAllBenchmarkIds();
    for (const locale of locales) {
      // Benchmark list page
      urls.push({
        url: `${baseUrl}/${locale}/benchmark`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: buildAlternates(baseUrl, '/benchmark'),
      });
      // Individual benchmark pages
      for (const benchmarkId of benchmarkIds) {
        urls.push({
          url: `${baseUrl}/${locale}/benchmark/${benchmarkId}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.6,
          alternates: buildAlternates(baseUrl, `/benchmark/${benchmarkId}`),
        });
      }
    }
  } else if (id === 'managers') {
    // Managers
    const managerIds = await getAllManagerIds();
    for (const locale of locales) {
      // Individual manager pages
      for (const managerId of managerIds) {
        urls.push({
          url: `${baseUrl}/${locale}/manager/${managerId}`,
          lastModified: now,
          changeFrequency: 'weekly',
          priority: 0.6,
          alternates: buildAlternates(baseUrl, `/manager/${managerId}`),
        });
      }
    } 
  }

  return urls;
}


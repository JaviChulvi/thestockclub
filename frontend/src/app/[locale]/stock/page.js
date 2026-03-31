import { generateLocalizedMetadata } from '@/lib/metadata';
import StocksListClient from '@/components/pages/StocksListClient';
import { API_BASE_URL } from '@/config/api';

export const revalidate = 604800;

async function fetchInitialData() {
  try {
    const params = new URLSearchParams();
    params.append('country', 'United States');
    params.append('limit', '18');

    const [filterOptionsRes, stocksRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/stock/filter-options`),
      fetch(`${API_BASE_URL}/api/stock/filter?${params.toString()}`),
    ]);

    const filterOptions = filterOptionsRes.ok ? await filterOptionsRes.json() : null;
    const stocks = stocksRes.ok ? await stocksRes.json() : null;

    return { filterOptions, stocks };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return generateLocalizedMetadata(locale, 'metadata.stocks', { path: '/stock' });
}

export default async function StocksListPage() {
  const data = await fetchInitialData();

  return <StocksListClient initialData={data} />;
}

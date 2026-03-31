import { generateDynamicMetadata } from '@/lib/metadata';
import StockDetailClient from '@/components/pages/StockDetailClient';
import { API_BASE_URL } from '@/config/api';

export const dynamicParams = true;
export const revalidate = 604800;

async function fetchStockData(ticker) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stock/${ticker}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { locale, ticker: encodedTicker } = await params;
  const ticker = decodeURIComponent(encodedTicker);
  const data = await fetchStockData(ticker);
  const stockName = data?.stock?.symbol || ticker;

  return generateDynamicMetadata(locale, 'metadata.stockDetail', {
    ticker: stockName,
    path: `/stock/${encodeURIComponent(ticker)}`
  });
}

export default async function StockDetailPage({ params }) {
  const { ticker: encodedTicker } = await params;
  const ticker = decodeURIComponent(encodedTicker);
  const data = await fetchStockData(ticker);

  return <StockDetailClient initialData={data} />;
}

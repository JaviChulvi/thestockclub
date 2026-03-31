import { generateDynamicMetadata } from '@/lib/metadata';
import FundDetailClient from '@/components/pages/FundDetailClient';
import { API_BASE_URL } from '@/config/api';

export const revalidate = 604800;

async function fetchFundData(isin) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/funds/${isin}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { locale, isin } = await params;
  const data = await fetchFundData(isin);
  const fundName = data?.fund?.long_name || data?.fund?.short_name || `Fund ${isin}`;

  return generateDynamicMetadata(locale, 'metadata.fundDetail', {
    fundName,
    isin: isin,
    path: `/fund/${isin}`
  });
}

export default async function FundDetailPage({ params }) {
  const { isin } = await params;
  const data = await fetchFundData(isin);

  return <FundDetailClient initialData={data} />;
}

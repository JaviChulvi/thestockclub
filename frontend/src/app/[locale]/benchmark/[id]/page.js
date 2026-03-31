import { generateDynamicMetadata } from '@/lib/metadata';
import BenchmarkDetailClient from '@/components/pages/BenchmarkDetailClient';
import { API_BASE_URL } from '@/config/api';

export const revalidate = 604800;

async function fetchBenchmarkData(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/funds/by-benchmark/${id}?limit=12&offset=0`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { locale, id } = await params;
  const data = await fetchBenchmarkData(id);
  const benchmarkName = data?.benchmark?.name || `Benchmark ${id}`;

  return generateDynamicMetadata(locale, 'metadata.benchmarkDetail', {
    benchmarkName,
    path: `/benchmark/${id}`
  });
}

export default async function BenchmarkDetailPage({ params }) {
  const { id } = await params;
  const data = await fetchBenchmarkData(id);

  return <BenchmarkDetailClient initialData={data} />;
}

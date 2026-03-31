import { generateLocalizedMetadata } from '@/lib/metadata';
import BenchmarkListClient from '@/components/pages/BenchmarkListClient';

export const revalidate = 604800;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return generateLocalizedMetadata(locale, 'metadata.benchmark', { path: '/benchmark' });
}

export default function BenchmarkListPage() {
  return <BenchmarkListClient />;
}

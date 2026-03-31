import { generateLocalizedMetadata } from '@/lib/metadata';
import FundsListClient from '@/components/pages/FundsListClient';
import { API_BASE_URL } from '@/config/api';

export const revalidate = 604800;

async function fetchInitialData() {
  try {
    const [categoriesRes, fundsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/categories/`),
      fetch(`${API_BASE_URL}/api/funds/random`),
    ]);

    const categories = categoriesRes.ok ? await categoriesRes.json() : null;
    const funds = fundsRes.ok ? await fundsRes.json() : null;

    return { categories, funds };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return generateLocalizedMetadata(locale, 'metadata.funds', { path: '/fund' });
}

export default async function FundsListPage() {
  const data = await fetchInitialData();

  return <FundsListClient initialData={data} />;
}

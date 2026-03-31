import { generateDynamicMetadata } from '@/lib/metadata';
import ManagerDetailClient from '@/components/pages/ManagerDetailClient';
import { API_BASE_URL } from '@/config/api';

export const revalidate = 604800;

async function fetchManagerData(id) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/funds/manager/${id}/20`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { locale, id } = await params;
  const data = await fetchManagerData(id);
  const managerName = data?.manager?.name || `Manager ${id}`;

  return generateDynamicMetadata(locale, 'metadata.manager', {
    managerName,
    path: `/manager/${id}`
  });
}

export default async function ManagerDetailPage({ params }) {
  const { id } = await params;
  const data = await fetchManagerData(id);

  return <ManagerDetailClient initialData={data} />;
}

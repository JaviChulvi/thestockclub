import { generateLocalizedMetadata } from '@/lib/metadata';
import AdminClient from '@/components/pages/AdminClient';

export const dynamic = 'force-static';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return generateLocalizedMetadata(locale, 'metadata.admin', { path: '/admin' });
}

export default function AdminPage() {
  return <AdminClient />;
}

import { generateLocalizedMetadata } from '@/lib/metadata';
import AdminDataSyncClient from '@/components/pages/AdminDataSyncClient';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return generateLocalizedMetadata(locale, 'metadata.admin', { path: '/admin/data-sync' });
}

export default function AdminDataSyncPage() {
  return <AdminDataSyncClient />;
}

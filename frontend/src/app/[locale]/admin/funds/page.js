import { generateLocalizedMetadata } from '@/lib/metadata';
import AdminFundsClient from '@/components/pages/AdminFundsClient';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return generateLocalizedMetadata(locale, 'metadata.admin', { path: '/admin/funds' });
}

export default function AdminFundsPage() {
  return <AdminFundsClient />;
}

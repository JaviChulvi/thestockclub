import { generateLocalizedMetadata } from '@/lib/metadata';
import AdminStocksClient from '@/components/pages/AdminStocksClient';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return generateLocalizedMetadata(locale, 'metadata.admin', { path: '/admin/stocks' });
}

export default function AdminStocksPage() {
  return <AdminStocksClient />;
}

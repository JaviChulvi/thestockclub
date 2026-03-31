import { generateLocalizedMetadata } from '@/lib/metadata';
import AdminUsersClient from '@/components/pages/AdminUsersClient';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return generateLocalizedMetadata(locale, 'metadata.admin', { path: '/admin/users' });
}

export default function AdminUsersPage() {
  return <AdminUsersClient />;
}

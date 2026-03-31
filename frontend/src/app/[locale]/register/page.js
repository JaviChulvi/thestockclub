import { generateLocalizedMetadata } from '@/lib/metadata';
import RegisterClient from '@/components/pages/RegisterClient';

export const dynamic = 'force-static';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return generateLocalizedMetadata(locale, 'metadata.register', { path: '/register' });
}

export default function RegisterPage() {
  return <RegisterClient />;
}

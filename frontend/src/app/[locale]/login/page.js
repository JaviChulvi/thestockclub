import { generateLocalizedMetadata } from '@/lib/metadata';
import LoginClient from '@/components/pages/LoginClient';

export const dynamic = 'force-static';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return generateLocalizedMetadata(locale, 'metadata.login', { path: '/login' });
}

export default function LoginPage() {
  return <LoginClient />;
}

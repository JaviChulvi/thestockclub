import { generateLocalizedMetadata } from '@/lib/metadata';
import HomeClient from '@/components/pages/HomeClient';

export const revalidate = 604800;

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return generateLocalizedMetadata(locale, 'metadata.home', { path: '' });
}

export default function HomePage() {
  return <HomeClient />;
}

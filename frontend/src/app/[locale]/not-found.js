'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <div className="bg-[#fff1e0] py-48 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Error Container */}
        <div className="bg-white border-4 border-black p-8 text-center">
          {/* Title */}
          <h2 className="text-3xl md:text-4xl font-bold text-black serif mb-4">
            {t('title')}
          </h2>

          {/* Subtitle */}
          <p className="text-xl text-gray-700 mb-8">
            {t('subtitle')}
          </p>

          {/* Navigation Button */}
          <Link
            href="/"
            className="inline-block bg-black text-[#fff1e0] px-8 py-4 font-bold text-sm transition-colors duration-200 hover:bg-gray-800 uppercase tracking-wide"
          >
            {t('navigation.backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import {useLocale} from 'next-intl';
import {usePathname, useRouter} from '@/i18n/navigation';
import {routing} from '@/i18n/routing';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale) => {
    router.push(pathname, {locale: newLocale});
  };

  return (
    <div className="flex items-center space-x-2 bg-gray-100 border border-gray-300 rounded-none">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchLocale(loc)}
          className={`px-3 py-1.5 text-sm font-medium uppercase tracking-wide transition-colors duration-200 ${
            locale === loc
              ? 'bg-black text-[#fff1e0]'
              : 'text-gray-600 hover:text-black hover:bg-gray-200'
          }`}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}


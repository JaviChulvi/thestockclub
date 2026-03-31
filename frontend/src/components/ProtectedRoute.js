'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, isAiEnabled } = useAuth();
  const router = useRouter();
  const t = useTranslations('protectedRoute');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  // Show loading state while checking authentication
  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fff1e0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">{t('message.loading')}</p>
        </div>
      </div>
    );
  }

  // If AI is not enabled, show informational page
  if (!isAiEnabled()) {
    return (
      <div className="min-h-screen bg-[#fff1e0] flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white border-4 border-black p-8 shadow-2xl">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-black text-[#fff1e0] flex items-center justify-center">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-black text-center mb-4 serif">
              {t('comingSoon.title')}
            </h1>

            {/* Description */}
            <p className="text-gray-700 text-center mb-6 leading-relaxed">
              {t('comingSoon.description')}
            </p>

            {/* Beta Tester Section */}
            <div className="bg-gray-50 border-2 border-gray-300 p-6 mb-6">
              <h2 className="text-xl font-bold text-black mb-3 serif">
                {t('comingSoon.betaTitle')}
              </h2>
              <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                {t('comingSoon.betaDescription')}
              </p>
              <a
                href="https://www.linkedin.com/in/javier-chulvi-bernad/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full bg-[#0077b5] hover:bg-[#006399] text-white px-6 py-3 font-bold text-sm transition-colors duration-200 uppercase tracking-wide"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
                {t('comingSoon.contactButton')}
              </a>
            </div>

            {/* Back Button */}
            <button
              onClick={() => router.push('/')}
              className="w-full bg-black hover:bg-gray-800 text-[#fff1e0] px-6 py-3 font-bold text-sm transition-colors duration-200 uppercase tracking-wide"
            >
              {t('comingSoon.backButton')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated, render the protected content
  return children;
}


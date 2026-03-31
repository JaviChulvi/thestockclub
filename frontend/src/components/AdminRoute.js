'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '../contexts/AuthContext';

export default function AdminRoute({ children }) {
  const { isAuthenticated, loading, isAdmin } = useAuth();
  const router = useRouter();
  const t = useTranslations('adminRoute');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Not authenticated, redirect to login
      router.push('/login');
    } else if (!loading && isAuthenticated && !isAdmin()) {
      // Authenticated but not admin, redirect to home
      router.push('/');
    }
  }, [isAuthenticated, loading, isAdmin, router]);

  // Show loading state while checking authentication
  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fff1e0] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">{t('loading', { default: 'Loading...' })}</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-[#fff1e0] flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white border-4 border-black p-8 shadow-2xl">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-600 text-white flex items-center justify-center">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-black text-center mb-4 serif">
              {t('accessDenied.title', { default: 'Access Denied' })}
            </h1>

            {/* Description */}
            <p className="text-gray-700 text-center mb-6 leading-relaxed">
              {t('accessDenied.description', { default: 'You do not have permission to access this page. This area is restricted to administrators only.' })}
            </p>

            {/* Back Button */}
            <button
              onClick={() => router.push('/')}
              className="w-full bg-black hover:bg-gray-800 text-[#fff1e0] px-6 py-3 font-bold text-sm transition-colors duration-200 uppercase tracking-wide"
            >
              {t('accessDenied.backButton', { default: 'Back to Home' })}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and is admin, render the protected content
  return children;
}


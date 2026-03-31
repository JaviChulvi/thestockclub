'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function AdminHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const userMenuRef = useRef(null);
  const router = useRouter();
  const { user, logout } = useAuth();
  const t = useTranslations('adminHeader');

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const hamburgerButton = document.querySelector('[aria-label="Toggle admin menu"]');
      if (hamburgerButton && hamburgerButton.contains(event.target)) {
        return;
      }

      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigationClick = (href) => {
    router.push(href);
    setIsMenuOpen(false);
  };

  return (
    <header className="border-b-2 border-red-800 bg-red-50 sticky top-0 z-50 shadow-md">
      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/admin" className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-red-900 flex items-center justify-center">
                <span className="text-white font-bold text-2xl serif tracking-wider">A</span>
              </div>
              <div className="flex flex-col">
                <span className="text-red-900 font-bold text-2xl serif leading-tight">
                  {t('adminPanel', { default: 'Admin Panel' })}
                </span>
                <span className="text-red-700 text-xs font-medium uppercase tracking-wider">
                  {t('management', { default: 'Management Dashboard' })}
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation and Actions */}
          <div className="flex items-center space-x-6">
            {/* Navigation */}
            <nav className="hidden lg:flex items-center space-x-6">
              <Link 
                href="/admin" 
                className="text-gray-800 hover:text-red-900 transition-colors duration-200 font-medium uppercase text-sm tracking-wide"
              >
                {t('dashboard', { default: 'Dashboard' })}
              </Link>
              <Link 
                href="/admin/users" 
                className="text-gray-800 hover:text-red-900 transition-colors duration-200 font-medium uppercase text-sm tracking-wide"
              >
                {t('users', { default: 'Users' })}
              </Link>
              <Link 
                href="/admin/funds" 
                className="text-gray-800 hover:text-red-900 transition-colors duration-200 font-medium uppercase text-sm tracking-wide"
              >
                {t('funds', { default: 'Funds' })}
              </Link>
              <Link 
                href="/admin/stocks" 
                className="text-gray-800 hover:text-red-900 transition-colors duration-200 font-medium uppercase text-sm tracking-wide"
              >
                {t('stocks', { default: 'Stocks' })}
              </Link>
              <Link 
                href="/admin/data-sync" 
                className="text-gray-800 hover:text-red-900 transition-colors duration-200 font-medium uppercase text-sm tracking-wide"
              >
                {t('dataSync', { default: 'Data Sync' })}
              </Link>
              
              {/* Back to Site */}
              <Link 
                href="/" 
                className="text-gray-600 hover:text-gray-800 transition-colors duration-200 font-medium text-sm tracking-wide flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t('backToSite', { default: 'Back to Site' })}
              </Link>
            </nav>

            {/* User Section - Desktop */}
            <div className="hidden lg:block relative group" ref={userMenuRef}>
              <button
                className="flex items-center space-x-2 bg-red-100 hover:bg-red-200 px-4 py-2 transition-colors duration-200 border border-red-300 whitespace-nowrap"
              >
                <div className="w-8 h-8 bg-red-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-gray-800 font-medium text-sm">
                    {user?.firstName}
                  </span>
                  <span className="text-xs text-red-700 font-semibold uppercase">
                    {t('admin', { default: 'Admin' })}
                  </span>
                </div>
                <svg className="w-4 h-4 text-gray-600 transition-transform flex-shrink-0 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border-2 border-red-800 shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900 break-words">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-600 mt-1 break-all">{user?.email}</p>
                  <p className="text-xs text-red-700 font-semibold mt-1 uppercase">{t('adminRole', { default: 'Administrator' })}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                >
                  {t('logout', { default: 'Logout' })}
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen((prev) => !prev);
              }}
              className="lg:hidden text-red-900 hover:text-red-700 transition-colors duration-200 p-2"
              aria-label="Toggle admin menu"
            >
              {isMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="fixed top-20 left-0 right-0 bg-white border-t border-red-200 z-50 max-h-[calc(100vh-5rem)] overflow-y-auto shadow-lg md:hidden" ref={menuRef}>
            {/* Navigation Section */}
            <div className="px-4 py-4">
              <nav className="flex flex-col space-y-3">
                <button
                  onClick={() => handleNavigationClick('/admin')}
                  className="text-left text-gray-800 hover:text-red-900 transition-colors duration-200 font-medium uppercase text-sm tracking-wide py-2"
                >
                  {t('dashboard', { default: 'Dashboard' })}
                </button>
                <button
                  onClick={() => handleNavigationClick('/admin/users')}
                  className="text-left text-gray-800 hover:text-red-900 transition-colors duration-200 font-medium uppercase text-sm tracking-wide py-2"
                >
                  {t('users', { default: 'Users' })}
                </button>
                <button
                  onClick={() => handleNavigationClick('/admin/funds')}
                  className="text-left text-gray-800 hover:text-red-900 transition-colors duration-200 font-medium uppercase text-sm tracking-wide py-2"
                >
                  {t('funds', { default: 'Funds' })}
                </button>
                <button
                  onClick={() => handleNavigationClick('/admin/settings')}
                  className="text-left text-gray-800 hover:text-red-900 transition-colors duration-200 font-medium uppercase text-sm tracking-wide py-2"
                >
                  {t('settings', { default: 'Settings' })}
                </button>
                <button
                  onClick={() => handleNavigationClick('/')}
                  className="text-left text-gray-600 hover:text-gray-800 transition-colors duration-200 font-medium text-sm tracking-wide py-2 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  {t('backToSite', { default: 'Back to Site' })}
                </button>
              </nav>
            </div>

            {/* User Section - Mobile */}
            <div className="px-4 py-4 border-t border-red-200">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-red-100 border border-red-300">
                  <div className="w-10 h-10 bg-red-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user?.firstName}
                    </p>
                    <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                    <p className="text-xs text-red-700 font-semibold uppercase">
                      {t('admin', { default: 'Admin' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full bg-red-600 text-white px-4 py-2 font-medium transition-colors duration-200 uppercase text-sm tracking-wide hover:bg-red-700 text-center"
                >
                  {t('logout', { default: 'Logout' })}
                </button>
                <LanguageSwitcher />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}


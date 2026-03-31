'use client';

import { useState, useEffect, useRef, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import SearchBar from '@/components/SearchBar';
import { useChatSidebar } from '@/contexts/ChatSidebarContext';

import { API_BASE_URL } from '@/config/api';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const menuRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();
  const t = useTranslations('header');

  // Check if we're on a chat page
  const isChatPage = pathname?.includes('/chat');

  // Try to get chat sidebar context — safe because ChatSidebarProvider
  // wraps the Header on chat pages via LayoutWrapper
  let isSidebarOpen = false;
  let openSidebar = null;

  if (isChatPage) {
    try {
      const chatContext = useChatSidebar();
      isSidebarOpen = chatContext.isSidebarOpen;
      openSidebar = chatContext.openSidebar;
    } catch (e) {
      // Context not available (non-chat pages)
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const hamburgerButton = document.querySelector('[aria-label="Toggle menu"]');
      if (hamburgerButton && hamburgerButton.contains(event.target)) return;
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close search dropdown when clicking outside (desktop only)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search function
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery.length >= 1) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);

  const performSearch = async (query) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/funds/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.funds || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && searchResults.length > 0) {
      router.push(`/fund/${searchResults[0].isin}`);
      clearSearch();
    }
  };

  const handleResultClick = (isin) => {
    router.push(`/fund/${isin}`);
    clearSearch();
  };

  const clearSearch = () => {
    setIsMenuOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchOpen(false);
  };

  const handleNavigationClick = (href) => {
    router.push(href);
    setIsMenuOpen(false);
  };

  return (
    <header className="border-b-2 border-gray-800 bg-[#fff1e0] sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-black flex items-center justify-center">
                <span className="text-[#fff1e0] font-bold text-2xl serif tracking-wider">SC</span>
              </div>
              <div className="flex flex-col">
                <span className="text-black font-bold text-2xl serif leading-tight">{t('siteName')}</span>
                <span className="text-gray-600 text-xs font-medium uppercase tracking-wider">{t('siteTagline')}</span>
              </div>
            </Link>
          </div>

          {/* Navigation and Actions */}
          <div className="flex items-center space-x-4">
            <nav className="hidden lg:flex items-center space-x-6">
              {/* Desktop Search */}
              <div className="flex-1 max-w-lg mx-4">
                <div className="relative" ref={searchRef}>
                  <SearchBar
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    searchResults={searchResults}
                    isLoading={isLoading}
                    isSearchOpen={isSearchOpen}
                    onSubmit={handleSearchSubmit}
                    onResultClick={handleResultClick}
                    onClear={clearSearch}
                    onFocus={() => setIsSearchOpen(true)}
                    placeholder={t('searchPlaceholder')}
                    className="w-72"
                  />
                </div>
              </div>
              <Link href="/chat" className="text-gray-800 hover:text-black transition-colors duration-200 font-medium uppercase text-sm tracking-wide">
                {t('aiChat')}
              </Link>
              <Link href="/stock" className="text-gray-800 hover:text-black transition-colors duration-200 font-medium uppercase text-sm tracking-wide">
                  STOCKS
              </Link>
              <div className="relative group">
                <button className="text-gray-800 hover:text-black transition-colors duration-200 font-medium uppercase text-sm tracking-wide flex items-center bg-gray-100 hover:bg-gray-200 px-4 py-2 border border-gray-300">
                  {t('funds')}
                  <svg className="w-4 h-4 ml-2 text-gray-600 group-hover:text-black transition-transform group-hover:rotate-180 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute top-full left-0 mt-2 min-w-full w-48 bg-white border-2 border-gray-800 shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link href="/fund" className="block px-4 py-3 text-gray-800 hover:bg-gray-50 hover:text-black transition-colors duration-200 font-medium uppercase text-sm tracking-wide border-b border-gray-200">
                    {t('viewAll')}
                  </Link>
                  <Link href="/benchmark" className="block px-4 py-3 text-gray-800 hover:bg-gray-50 hover:text-black transition-colors duration-200 font-medium uppercase text-sm tracking-wide border-b border-gray-200">
                    {t('benchmarks')}
                  </Link>
                  <Link href="/compare" className="block px-4 py-3 text-gray-800 hover:bg-gray-50 hover:text-black transition-colors duration-200 font-medium uppercase text-sm tracking-wide">
                    {t('compare')}
                  </Link>
                </div>
              </div>
            </nav>

            {/* Auth Section - Desktop */}
            {isAuthenticated ? (
              <div className="hidden lg:block relative group">
                <button className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 transition-colors duration-200 border border-gray-300 whitespace-nowrap">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-[#fff1e0] font-bold text-sm">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </span>
                  </div>
                  <span className="text-gray-800 font-medium text-sm">{user?.firstName}</span>
                  <svg className="w-4 h-4 text-gray-600 transition-transform flex-shrink-0 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border-2 border-gray-800 shadow-lg z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900 break-words">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-600 mt-1 break-all">{user?.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                  >
                    {t('logout')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="hidden lg:flex items-center space-x-4">
                <Link href="/login" className="bg-black text-[#fff1e0] px-4 py-2 font-medium transition-colors duration-200 uppercase text-sm tracking-wide hover:bg-gray-800">
                  {t('login')}
                </Link>
                <Link href="/register" className="bg-gray-800 text-[#fff1e0] px-4 py-2 font-medium transition-colors duration-200 uppercase text-sm tracking-wide hover:bg-black border border-gray-600">
                  {t('register')}
                </Link>
                <LanguageSwitcher />
              </div>
            )}

            {/* Chat Sidebar Toggle - mobile only on chat pages */}
            {isChatPage && !isSidebarOpen && openSidebar && (
              <button
                onClick={openSidebar}
                className="lg:hidden text-gray-600 hover:text-black transition-colors duration-200 p-2 mr-2"
                aria-label="Open conversations"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen((prev) => !prev);
              }}
              className="lg:hidden text-gray-600 hover:text-black transition-colors duration-200 p-2"
              aria-label="Toggle menu"
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
          <div className="fixed top-20 left-0 right-0 bg-white border-t border-gray-200 z-50 max-h-[calc(100vh-5rem)] overflow-y-auto shadow-lg lg:hidden" ref={menuRef}>
            {/* Mobile Search */}
            <div className="px-4 py-4 border-b border-gray-200">
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchResults={searchResults}
                isLoading={isLoading}
                onSubmit={handleSearchSubmit}
                onResultClick={handleResultClick}
                onClear={() => { setSearchQuery(''); setSearchResults([]); }}
                inputRef={searchInputRef}
                placeholder={t('searchPlaceholderMobile')}
              />
            </div>

            {/* Navigation Section */}
            <div className="px-4 py-4">
              <nav className="flex flex-col space-y-3">
                <button onClick={() => handleNavigationClick('/chat')} className="text-left text-gray-800 hover:text-black transition-colors duration-200 font-medium uppercase text-sm tracking-wide py-2">
                  {t('aiChat')}
                </button>
                <button onClick={() => handleNavigationClick('/stock')} className="text-left text-gray-800 hover:text-black transition-colors duration-200 font-medium uppercase text-sm tracking-wide py-2">
                  STOCKS
                </button>
                <button onClick={() => handleNavigationClick('/fund')} className="text-left text-gray-800 hover:text-black transition-colors duration-200 font-medium uppercase text-sm tracking-wide py-2">
                  {t('funds')}
                </button>
                <button onClick={() => handleNavigationClick('/benchmark')} className="text-left text-gray-800 hover:text-black transition-colors duration-200 font-medium uppercase text-sm tracking-wide py-2">
                  {t('benchmarks')}
                </button>
                <button onClick={() => handleNavigationClick('/compare')} className="text-left text-gray-800 hover:text-black transition-colors duration-200 font-medium uppercase text-sm tracking-wide py-2">
                  {t('compare')}
                </button>
              </nav>
            </div>

            {/* Auth Section - Mobile */}
            <div className="px-4 py-4 border-t border-gray-200">
              {isAuthenticated ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-gray-100 border border-gray-300">
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-[#fff1e0] font-bold">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.firstName}</p>
                      <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { logout(); setIsMenuOpen(false); }}
                    className="w-full bg-red-600 text-white px-4 py-2 font-medium transition-colors duration-200 uppercase text-sm tracking-wide hover:bg-red-700 text-center"
                  >
                    {t('logout')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col space-y-2">
                  <Link href="/login" onClick={() => setIsMenuOpen(false)} className="bg-black text-[#fff1e0] px-4 py-2 font-medium transition-colors duration-200 uppercase text-sm tracking-wide hover:bg-gray-800 text-center">
                    {t('login')}
                  </Link>
                  <Link href="/register" onClick={() => setIsMenuOpen(false)} className="bg-gray-800 text-[#fff1e0] px-4 py-2 font-medium transition-colors duration-200 uppercase text-sm tracking-wide hover:bg-black border border-gray-600 text-center">
                    {t('register')}
                  </Link>
                  <LanguageSwitcher />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

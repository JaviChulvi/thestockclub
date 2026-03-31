'use client';

import { useTranslations } from 'next-intl';

/**
 * Shared search input with results dropdown.
 * Used by Header for both desktop and mobile search.
 */
export default function SearchBar({
  searchQuery,
  setSearchQuery,
  searchResults,
  isLoading,
  isSearchOpen,
  onSubmit,
  onResultClick,
  onClear,
  onFocus,
  inputRef,
  placeholder,
  showDropdown = true,
  className = '',
}) {
  const t = useTranslations('header');

  return (
    <div className={className}>
      <form onSubmit={onSubmit}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={onFocus}
            placeholder={placeholder}
            className="w-full pl-12 pr-10 py-3 bg-[#f8f6f0] border-2 border-gray-400 rounded-none focus:outline-none focus:border-gray-800 focus:bg-white transition-all duration-200 text-sm placeholder-gray-600 font-serif"
          />
          <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {isLoading && (
            <div className="absolute right-4 top-3.5">
              <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-black rounded-full"></div>
            </div>
          )}
          {searchQuery && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-full p-1 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {showDropdown && searchQuery && (isSearchOpen !== false) && (
        <SearchResults
          searchResults={searchResults}
          searchQuery={searchQuery}
          isLoading={isLoading}
          onResultClick={onResultClick}
          noResultsText={t('noFundsFound')}
          retryText={t('verifyAndRetry')}
        />
      )}
    </div>
  );
}

function SearchResults({ searchResults, searchQuery, isLoading, onResultClick, noResultsText, retryText }) {
  return (
    <div className="mt-1 w-full bg-[#f8f6f0] border-2 border-gray-400 shadow-lg z-50 max-h-80 overflow-hidden font-serif">
      <div className="max-h-80 overflow-y-auto">
        {searchResults.length > 0 ? (
          <div className="py-1">
            {searchResults.map((fund) => (
              <button
                key={fund.isin}
                onClick={() => onResultClick(fund.isin)}
                className="w-full text-left px-4 py-3 hover:bg-[#ede8da] transition-colors duration-200 border-b border-gray-300 last:border-b-0 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 text-sm group-hover:text-black transition-colors leading-tight">
                      {fund.name}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 font-mono">
                      {fund.isin}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {fund.type}
                    </div>
                  </div>
                  <div className="ml-3 flex items-center space-x-2">
                    <span className="text-xs text-gray-700 uppercase tracking-wide bg-gray-200 px-2 py-1 border border-gray-400">
                      {fund.currency}
                    </span>
                    <svg className="w-4 h-4 text-gray-500 group-hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : searchQuery.length >= 1 && !isLoading ? (
          <div className="p-6 text-center">
            <svg className="w-8 h-8 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-gray-700 text-sm font-semibold">{noResultsText}</p>
            <p className="text-gray-500 text-xs mt-1">{retryText}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

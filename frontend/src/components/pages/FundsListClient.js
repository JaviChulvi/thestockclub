'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import FundCard from '@/components/FundCard';
import FundTable from '@/components/FundTable';

// API Configuration
import { API_BASE_URL } from '@/config/api';

const FUNDS_PER_PAGE = 18;

export default function FundsListPage({ initialData }) {
  const t = useTranslations('funds');

  const hasInitialCategories = initialData?.categories?.success && initialData.categories.categories;
  const hasInitialFunds = initialData?.funds?.funds != null;

  const [categories, setCategories] = useState(() => hasInitialCategories ? initialData.categories.categories : []);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [funds, setFunds] = useState(() => hasInitialFunds ? initialData.funds.funds : []);
  const [loading, setLoading] = useState(!hasInitialFunds);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(() => hasInitialFunds ? {
    total: initialData.funds.funds?.length || 0,
    offset: 0,
    hasMore: false
  } : {
    total: 0,
    offset: 0,
    hasMore: false
  });

  const hasLoaded = useRef(hasInitialFunds);
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);
  const isFetchingRef = useRef(false);

  // Fetch categories on mount (only if not provided via initialData)
  useEffect(() => {
    if (hasInitialCategories) return;

    async function loadCategories() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/categories/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.categories) {
            setCategories(data.categories);
          }
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    }

    loadCategories();
  }, [hasInitialCategories]);

  const fetchFunds = useCallback(async (categoryId, offset = 0, isInitial = false) => {
    // Prevent duplicate requests
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      let url;
      if (categoryId === null) {
        // Fetch random funds
        url = `${API_BASE_URL}/api/funds/random`;
      } else {
        // Fetch category funds with pagination
        url = `${API_BASE_URL}/api/categories/${categoryId}/funds?limit=${FUNDS_PER_PAGE}&offset=${offset}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (isInitial) {
        setFunds(data.funds || []);
      } else {
        // Append new funds to existing list
        setFunds(prevFunds => [...prevFunds, ...(data.funds || [])]);
      }
      
      // Update pagination info (only available for category filtering)
      if (data.pagination) {
        setPagination({
          total: data.pagination.total || 0,
          offset: data.pagination.offset || 0,
          hasMore: data.pagination.has_more || false
        });
      } else {
        // For random funds, no pagination
        setPagination({
          total: data.funds?.length || 0,
          offset: 0,
          hasMore: false
        });
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching funds:', err);
      if (isInitial) {
        setError(t('message.error'));
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
      isFetchingRef.current = false;
    }
  }, [t]);

  // Fetch initial random funds (only if not provided via initialData)
  useEffect(() => {
    if (!hasLoaded.current) {
      fetchFunds(null, 0, true);
      hasLoaded.current = true;
    }
  }, [fetchFunds]);

  // Setup Intersection Observer for infinite scroll
  useEffect(() => {
    // Only set up observer for category filtering (not for random funds)
    if (selectedCategory === null || !pagination.hasMore || loading) return;

    const currentLoadMoreRef = loadMoreRef.current;
    if (!currentLoadMoreRef) return;

    const options = {
      root: null,
      rootMargin: '200px',
      threshold: 0
    };

    const handleIntersection = (entries) => {
      const target = entries[0];
      if (target.isIntersecting && !isFetchingRef.current) {
        fetchFunds(selectedCategory, pagination.offset + FUNDS_PER_PAGE, false);
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersection, options);
    observerRef.current.observe(currentLoadMoreRef);

    return () => {
      if (observerRef.current && currentLoadMoreRef) {
        observerRef.current.unobserve(currentLoadMoreRef);
        observerRef.current.disconnect();
      }
    };
  }, [selectedCategory, pagination.hasMore, pagination.offset, loading, fetchFunds]);

  const handleCategoryChange = (e) => {
    const categoryId = e.target.value === '' ? null : parseInt(e.target.value);
    setSelectedCategory(categoryId);
    fetchFunds(categoryId, 0, true);
  };

  return (
    <div className="bg-[#fff1e0] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="pb-4">
          <h1 className="text-2xl md:text-4xl font-bold text-black leading-tight serif mb-2">
            {t('title')}
          </h1>
          <h2 className="text-sm md:text-base font-light text-gray-800 leading-relaxed">
            {t('subtitle')}
          </h2>
        </div>

        {/* Category Filter */}
        <div className="bg-white border-2 border-black p-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:gap-4">
            <label htmlFor="category-select" className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2 md:mb-0">
              {t('filter.selectCategory')}
            </label>
            <select
              id="category-select"
              value={selectedCategory === null ? '' : selectedCategory}
              onChange={handleCategoryChange}
              className="flex-1 md:flex-none md:w-64 px-4 py-3 border-2 border-gray-300 bg-white text-black font-medium focus:border-black focus:outline-none transition-colors"
            >
              <option value="">{t('filter.allCategories')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.fullname || category.name} ({category.fund_count})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white border-2 border-black p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">{t('message.loading')}</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white border-2 border-red-600 p-6 mb-8">
            <div className="flex items-center">
              <div className="text-red-600 font-bold mr-3">⚠️</div>
              <div>
                <h3 className="text-lg font-bold text-red-800 serif">{t('message.error')}</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Showing count (only for category filtering) */}
        {!loading && selectedCategory !== null && funds.length > 0 && (
          <div className="mb-4 text-sm text-gray-600">
            {t('showing', { count: funds.length, total: pagination.total })}
          </div>
        )}

        {/* Funds Display */}
        {!loading && !error && (
          <>
            {funds.length > 0 ? (
              <>
                {/* Mobile View - Cards */}
                <div className="md:hidden">
                  <div className="grid grid-cols-1 gap-6">
                    {funds.map((fund) => (
                      <FundCard key={fund.id || fund.isin} fund={fund} />
                    ))}
                  </div>
                </div>

                {/* Desktop View - Table */}
                <div className="hidden md:block">
                  <FundTable funds={funds} />
                </div>

                {/* Load More Trigger (only for category filtering) */}
                {selectedCategory !== null && pagination.hasMore && (
                  <div ref={loadMoreRef} className="flex flex-col items-center justify-center mt-8 py-8">
                    {loadingMore ? (
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
                        <p className="text-gray-600 text-sm font-medium">{t('message.loadingMore')}</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => fetchFunds(selectedCategory, pagination.offset + FUNDS_PER_PAGE, false)}
                        className="bg-black text-[#fff1e0] px-6 py-3 font-bold text-sm uppercase tracking-wide hover:bg-gray-800 transition-colors"
                      >
                        {t('button.loadMore')}
                      </button>
                    )}
                  </div>
                )}

                {/* End of Results Message (only for category filtering) */}
                {selectedCategory !== null && !pagination.hasMore && funds.length > 0 && (
                  <div className="text-center py-8 mt-8 border-t-2 border-gray-300">
                    <p className="text-gray-600 font-medium">
                      {t('message.endOfResults', { total: pagination.total })}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white border-2 border-black p-12 text-center">
                <div className="text-2xl font-bold text-black serif mb-4">
                  {t('message.noFunds')}
                </div>
                <p className="text-gray-700 font-medium">
                  {t('message.noFundsDesc')}
                </p>
              </div>
            )}
          </>
        )}

        {/* Market Stats Section */}
        <div className="border-t-4 border-black my-8 pt-4">
          <h3 className="text-2xl font-bold text-black serif mb-6">Estadísticas del Mercado</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border-2 border-black p-6 text-center">
              <div className="text-3xl font-bold text-black serif mb-2">44.000+</div>
              <div className="text-sm text-gray-600 uppercase tracking-wide font-bold">Fondos Analizados</div>
            </div>
            <div className="bg-white border-2 border-black p-6 text-center">
              <div className="text-3xl font-bold text-black serif mb-2">€2.4T</div>
              <div className="text-sm text-gray-600 uppercase tracking-wide font-bold">Activos Monitorizados</div>
            </div>
            <div className="bg-white border-2 border-black p-6 text-center">
              <div className="text-3xl font-bold text-black serif mb-2">150+</div>
              <div className="text-sm text-gray-600 uppercase tracking-wide font-bold">Mercados Globales</div>
            </div>
            <div className="bg-white border-2 border-black p-6 text-center">
              <div className="text-3xl font-bold text-black serif mb-2">24/7</div>
              <div className="text-sm text-gray-600 uppercase tracking-wide font-bold">Análisis Disponible</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
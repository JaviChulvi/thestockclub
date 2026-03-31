'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link as IntlLink } from '@/i18n/navigation';

import { API_BASE_URL } from '@/config/api';

const BENCHMARKS_PER_PAGE = 15;

export default function BenchmarksPage() {
  const [benchmarks, setBenchmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    offset: 0,
    hasMore: true
  });
  const t = useTranslations('benchmark');
  
  const hasLoaded = useRef(false);
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);
  const isFetchingRef = useRef(false);
  const router = useRouter();

  const fetchBenchmarks = useCallback(async (offset = 0, isInitial = false) => {
    // Prevent duplicate requests
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const url = `${API_BASE_URL}/api/benchmarks?limit=${BENCHMARKS_PER_PAGE}&offset=${offset}`;
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
        setBenchmarks(data.benchmarks || []);
      } else {
        // Append new benchmarks to existing list
        setBenchmarks(prevBenchmarks => [...prevBenchmarks, ...(data.benchmarks || [])]);
      }
      
      setPagination({
        total: data.pagination?.total || 0,
        offset: data.pagination?.offset || 0,
        hasMore: data.pagination?.has_more || false
      });
      
      setError(null);
    } catch (err) {
      console.error('Error fetching benchmarks:', err);
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

  // Fetch initial data
  useEffect(() => {
    if (!hasLoaded.current) {
      fetchBenchmarks(0, true);
      hasLoaded.current = true;
    }
  }, [fetchBenchmarks]);

  // Setup Intersection Observer for infinite scroll
  useEffect(() => {
    // Don't set up observer if no more data or still loading
    if (!pagination.hasMore || loading) return;

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
        fetchBenchmarks(pagination.offset + BENCHMARKS_PER_PAGE, false);
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
  }, [pagination.hasMore, pagination.offset, loading, fetchBenchmarks]);

  if (loading || !benchmarks) {
    return (
      <div className="bg-[#fff1e0] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">{t('message.loading')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#fff1e0] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border-l-4 border-red-600 p-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">{t('message.error')}</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fff1e0] min-h-screen">
      {/* Breaking News Banner */}
      <div className="bg-[#315b97] text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <span className="font-bold text-sm uppercase mr-4">{t('banner.title')}</span>
            <span className="text-sm">{t('banner.subtitle', { total: pagination.total })}</span>
          </div>
        </div>
      </div>

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

        {/* Showing count */}
        {benchmarks.length > 0 && (
          <div className="mb-4 text-sm text-gray-600">
            {t('showing', { count: benchmarks.length, total: pagination.total })}
          </div>
        )}

        {/* Benchmarks Grid */}
        {benchmarks.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {benchmarks.map((benchmark) => (
                <div key={benchmark.id} className="bg-white border-2 border-black transition-all duration-200 hover:shadow-lg hover:shadow-black/10">
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-black serif mb-3 leading-tight">
                      {benchmark.name}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 mb-4">
                      <span className="font-medium">{benchmark.fund_count || 0} fondos asociados</span>
                    </div>
                    <IntlLink
                      href={`/benchmark/${benchmark.id}`}
                      className="block w-full bg-black text-[#fff1e0] py-3 font-bold text-sm transition-all duration-200 hover:bg-gray-800 uppercase tracking-wide text-center"
                    >
                      {t('button.viewFunds')}
                    </IntlLink>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Trigger */}
            {pagination.hasMore && (
              <div ref={loadMoreRef} className="flex flex-col items-center justify-center mt-8 py-8">
                {loadingMore ? (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
                    <p className="text-gray-600 text-sm font-medium">{t('message.loadingMore')}</p>
                  </div>
                ) : (
                  <button
                    onClick={() => fetchBenchmarks(pagination.offset + BENCHMARKS_PER_PAGE, false)}
                    className="bg-black text-[#fff1e0] px-6 py-3 font-bold text-sm uppercase tracking-wide hover:bg-gray-800 transition-colors"
                  >
                    {t('button.loadMore')}
                  </button>
                )}
              </div>
            )}

            {/* End of Results Message */}
            {!pagination.hasMore && benchmarks.length > 0 && (
              <div className="text-center py-8 mt-8 border-t-2 border-gray-300">
                <p className="text-gray-600 font-medium">
                  {t('message.endOfResults', { total: pagination.total })}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white border-2 border-black p-8 text-center">
            <h3 className="text-xl font-bold text-black serif mb-4">
              {t('message.noFunds')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('message.noFundsDesc')}
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 border-t-4 border-black pt-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <IntlLink
              href="/fondos"
              className="bg-gray-200 text-black px-6 py-3 font-bold text-sm transition-colors duration-200 hover:bg-gray-300 uppercase tracking-wide text-center"
            >
              {t('navigation.backToFunds')}
            </IntlLink>
            <IntlLink
              href="/chat"
              className="bg-black text-[#fff1e0] px-6 py-3 font-bold text-sm transition-colors duration-200 hover:bg-gray-800 uppercase tracking-wide text-center"
            >
              {t('navigation.consulting')}
            </IntlLink>
          </div>
        </div>
      </div>
    </div>
  );
}

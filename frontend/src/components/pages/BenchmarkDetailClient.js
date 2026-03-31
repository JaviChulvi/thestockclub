'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Link as IntlLink } from '@/i18n/navigation';
import FundCard from '@/components/FundCard';

import { API_BASE_URL } from '@/config/api';

const FUNDS_PER_PAGE = 12;

export default function BenchmarkFundsPage({ initialData }) {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const t = useTranslations('benchmarkDetail');

  const hasInitialData = initialData?.benchmark != null;
  const [benchmarkData, setBenchmarkData] = useState(() => hasInitialData ? (initialData.benchmark || {}) : null);
  const [funds, setFunds] = useState(() => hasInitialData ? (initialData.funds || []) : []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(() => hasInitialData ? {
    total: initialData.pagination?.total || 0,
    offset: initialData.pagination?.offset || 0,
    hasMore: initialData.pagination?.has_more || false
  } : {
    total: 0,
    offset: 0,
    hasMore: true
  });

  const hasLoaded = useRef(hasInitialData);
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);
  const isFetchingRef = useRef(false);

  const fetchBenchmarkData = useCallback(async (offset = 0, isInitial = false) => {
    // Prevent duplicate requests
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const url = `${API_BASE_URL}/api/funds/by-benchmark/${id}?limit=${FUNDS_PER_PAGE}&offset=${offset}`;
      const fundsResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!fundsResponse.ok) {
        throw new Error(`HTTP error! status: ${fundsResponse.status}`);
      }

      const fundsData = await fundsResponse.json();

      if (isInitial) {
        setBenchmarkData(fundsData.benchmark || {});
        setFunds(fundsData.funds || []);
      } else {
        // Append new funds to existing list
        setFunds(prevFunds => [...prevFunds, ...(fundsData.funds || [])]);
      }

      setPagination({
        total: fundsData.pagination?.total || 0,
        offset: fundsData.pagination?.offset || 0,
        hasMore: fundsData.pagination?.has_more || false
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching benchmark data:', err);
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
  }, [id, t]);

  // Fetch initial data only if no initialData provided
  useEffect(() => {
    if (id && !hasLoaded.current) {
      fetchBenchmarkData(0, true);
      hasLoaded.current = true;
    }
  }, [id, fetchBenchmarkData]);

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
        fetchBenchmarkData(pagination.offset + FUNDS_PER_PAGE, false);
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
  }, [pagination.hasMore, pagination.offset, loading, fetchBenchmarkData]);

  if (loading || !benchmarkData || !funds) {
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

  if (error || !benchmarkData || !funds) {
    return (
      <div className="bg-[#fff1e0] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border-l-4 border-red-600 p-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">{t('message.error')}</h3>
            <p className="text-red-700">{error || t('message.errorDesc')}</p>
            <IntlLink
              href="/fondos"
              className="mt-4 inline-block bg-black text-[#fff1e0] px-4 py-2 font-bold text-sm uppercase tracking-wide hover:bg-gray-800"
            >
              {t('navigation.backToFunds')}
            </IntlLink>
          </div>
        </div>
      </div>
    );
  }
  if (benchmarkData && !loading && !error) {
    return (
      <div className="bg-[#fff1e0] min-h-screen">
        {/* Breaking News Banner */}
        <div className="bg-[#315b97] text-white py-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <span className="font-bold text-sm uppercase mr-4">{t('banner.title')}</span>
              <span className="text-sm">{t('banner.subtitle', { name: benchmarkData.name, total: pagination.total })}</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Benchmark Header */}
          <div className="border-b-4 border-black pb-8 mb-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-bold text-black leading-tight serif mb-4">
                  {benchmarkData.name}
                </h1>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="font-medium">{t('header.label')}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-6xl font-bold text-black serif mb-2">
                  {pagination.total}
                </div>
                <div className="text-sm text-gray-600 uppercase tracking-wide">
                  {t('header.relatedFunds')}
                </div>
              </div>
            </div>
          </div>

          {/* Showing count */}
          {funds.length > 0 && (
            <div className="mb-4 text-sm text-gray-600">
              {t('showing', { count: funds.length, total: pagination.total })}
            </div>
          )}

          {/* Funds Grid */}
          {funds.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {funds.map((fund) => (
                  <FundCard
                    key={fund.isin}
                    fund={fund}
                  />
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
                      onClick={() => fetchBenchmarkData(pagination.offset + FUNDS_PER_PAGE, false)}
                      className="bg-black text-[#fff1e0] px-6 py-3 font-bold text-sm uppercase tracking-wide hover:bg-gray-800 transition-colors"
                    >
                      {t('button.loadMore')}
                    </button>
                  )}
                </div>
              )}

              {/* End of Results Message */}
              {!pagination.hasMore && funds.length > 0 && (
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
              <IntlLink
                href="/fondos"
                className="inline-block bg-black text-[#fff1e0] px-6 py-3 font-bold text-sm uppercase tracking-wide hover:bg-gray-800"
              >
                {t('navigation.viewAll')}
              </IntlLink>
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
}


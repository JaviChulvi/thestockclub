'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import StockCard from '@/components/StockCard';
import StockTable from '@/components/StockTable';

// API Configuration
import { API_BASE_URL } from '@/config/api';

export default function StocksListPage({ initialData }) {
  const t = useTranslations('stocks');

  const hasInitialFilterOptions = initialData?.filterOptions?.options != null;
  const hasInitialStocks = initialData?.stocks?.stocks != null;

  const [stocks, setStocks] = useState(() => hasInitialStocks ? initialData.stocks.stocks : []);
  const [loading, setLoading] = useState(!hasInitialStocks);
  const [error, setError] = useState(null);
  const [filterOptions, setFilterOptions] = useState(() =>
    hasInitialFilterOptions ? initialData.filterOptions.options : { countries: [], sectors: [], currencies: [] }
  );
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    country: 'United States',
    sector: '',
    currency: '',
    trailingPEMin: '',
    trailingPEMax: '',
    forwardPEMin: '',
    forwardPEMax: '',
  });

  const hasLoaded = useRef(hasInitialStocks);

  // Fetch filter options on mount (only if not provided via initialData)
  useEffect(() => {
    if (hasInitialFilterOptions) return;

    async function fetchFilterOptions() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stock/filter-options`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setFilterOptions(data.options || { countries: [], sectors: [], currencies: [] });
        }
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    }

    fetchFilterOptions();
  }, [hasInitialFilterOptions]);

  // Fetch stocks (only if not provided via initialData)
  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    fetchStocks();
  }, []);

  async function fetchStocks() {
    try {
      setLoading(true);

      // Check if any filters are applied
      const hasFilters = Object.values(filters).some(value => value !== '');

      let url;
      if (hasFilters) {
        // Build query params for filtered endpoint
        const params = new URLSearchParams();
        if (filters.country) params.append('country', filters.country);
        if (filters.sector) params.append('sector', filters.sector);
        if (filters.currency) params.append('currency', filters.currency);
        if (filters.trailingPEMin) params.append('trailing_pe_min', filters.trailingPEMin);
        if (filters.trailingPEMax) params.append('trailing_pe_max', filters.trailingPEMax);
        if (filters.forwardPEMin) params.append('forward_pe_min', filters.forwardPEMin);
        if (filters.forwardPEMax) params.append('forward_pe_max', filters.forwardPEMax);
        params.append('limit', '18');

        url = `${API_BASE_URL}/api/stock/filter?${params.toString()}`;
      } else {
        // Use random endpoint if no filters
        url = `${API_BASE_URL}/api/stock/random`;
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
      setStocks(data.stocks || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching stocks:', err);
      setError(t('message.error'));
    } finally {
      setLoading(false);
    }
  }

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyFilters = () => {
    hasLoaded.current = false;
    fetchStocks();
  };

  const clearFilters = () => {
    setFilters({
      country: 'United States',
      sector: '',
      currency: '',
      trailingPEMin: '',
      trailingPEMax: '',
      forwardPEMin: '',
      forwardPEMax: '',
    });
    hasLoaded.current = false;
    setTimeout(() => fetchStocks(), 100);
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

        {/* Filter Section */}
        <div className="bg-white border-2 border-black p-4 mb-4">
          <div className={`flex items-center justify-between ${showFilters ? ' mb-4' : ''}`}>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Filters</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-black text-[#fff1e0] px-4 py-2 font-bold text-sm uppercase tracking-wide hover:bg-gray-800"
            >
              {showFilters ? 'Hide' : 'Show'}
            </button>
          </div>

          {showFilters && (
            <div className="space-y-4 pt-4 border-t-2 border-gray-200">
              {/* First Row: Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">
                    Country
                  </label>
                  <select
                    value={filters.country}
                    onChange={(e) => handleFilterChange('country', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 bg-white text-black font-medium focus:border-black focus:outline-none transition-colors"
                  >
                    <option value="">All Countries</option>
                    {filterOptions.countries.map((country) => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">
                    Sector
                  </label>
                  <select
                    value={filters.sector}
                    onChange={(e) => handleFilterChange('sector', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 bg-white text-black font-medium focus:border-black focus:outline-none transition-colors"
                  >
                    <option value="">All Sectors</option>
                    {filterOptions.sectors.map((sector) => (
                      <option key={sector} value={sector}>{sector}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={filters.currency}
                    onChange={(e) => handleFilterChange('currency', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 bg-white text-black font-medium focus:border-black focus:outline-none transition-colors"
                  >
                    <option value="">All Currencies</option>
                    {filterOptions.currencies.map((currency) => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Second Row: PE Ratios */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">
                    Trailing P/E Ratio
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.trailingPEMin}
                      onChange={(e) => handleFilterChange('trailingPEMin', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 bg-white text-black font-medium focus:border-black focus:outline-none transition-colors"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.trailingPEMax}
                      onChange={(e) => handleFilterChange('trailingPEMax', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 bg-white text-black font-medium focus:border-black focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">
                    Forward P/E Ratio
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.forwardPEMin}
                      onChange={(e) => handleFilterChange('forwardPEMin', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 bg-white text-black font-medium focus:border-black focus:outline-none transition-colors"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.forwardPEMax}
                      onChange={(e) => handleFilterChange('forwardPEMax', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 bg-white text-black font-medium focus:border-black focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end">
                <button
                  onClick={clearFilters}
                  className="bg-gray-200 text-black px-6 py-3 font-bold text-sm uppercase tracking-wide hover:bg-gray-300 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={applyFilters}
                  className="bg-black text-[#fff1e0] px-6 py-3 font-bold text-sm uppercase tracking-wide hover:bg-gray-800 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
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

        {/* Showing count (when filters are applied) */}
        {!loading && stocks.length > 0 && Object.values(filters).some(value => value !== '') && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {stocks.length} stock{stocks.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Stocks Display */}
        {!loading && !error && (
          <>
            {stocks.length > 0 ? (
              <>
                {/* Mobile View - Cards */}
                <div className="md:hidden">
                  <div className="grid grid-cols-1 gap-6">
                    {stocks.map((stock) => (
                      <StockCard key={stock.id || stock.symbol} stock={stock} />
                    ))}
                  </div>
                </div>

                {/* Desktop View - Table */}
                <div className="hidden md:block">
                  <StockTable stocks={stocks} />
                </div>
              </>
            ) : (
              <div className="bg-white border-2 border-black p-12 text-center">
                <div className="text-2xl font-bold text-black serif mb-4">
                  {t('message.noStocks')}
                </div>
                <p className="text-gray-700 font-medium">
                  {t('message.noStocksDesc')}
                </p>
              </div>
            )}
          </>
        )}

        {/* Market Stats Section */}
        <div className="border-t-4 border-black my-8 pt-4">
          <h3 className="text-2xl font-bold text-black serif mb-6">
            {t('marketStats.title')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white border-2 border-black p-6 text-center">
              <div className="text-3xl font-bold text-black serif mb-2">
                {t('marketStats.stocksAnalyzed')}
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wide font-bold">
                {t('marketStats.stocksAnalyzedLabel')}
              </div>
            </div>
            <div className="bg-white border-2 border-black p-6 text-center">
              <div className="text-3xl font-bold text-black serif mb-2">
                {t('marketStats.marketCap')}
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wide font-bold">
                {t('marketStats.marketCapLabel')}
              </div>
            </div>
            <div className="bg-white border-2 border-black p-6 text-center">
              <div className="text-3xl font-bold text-black serif mb-2">
                {t('marketStats.exchanges')}
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wide font-bold">
                {t('marketStats.exchangesLabel')}
              </div>
            </div>
            <div className="bg-white border-2 border-black p-6 text-center">
              <div className="text-3xl font-bold text-black serif mb-2">
                {t('marketStats.availability')}
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wide font-bold">
                {t('marketStats.availabilityLabel')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import PriceChart from '@/components/PriceChart';
import { formatPrice, formatReturn, getReturnColor, formatNumber, formatPercentage } from '@/lib/utils';

import { API_BASE_URL } from '@/config/api';

function parseJsonFields(fund) {
  const jsonFields = ['asset_classes', 'bond_holdings', 'equity_holdings', 'classes', 'sector_weightings', 'fund_overview', 'bond_ratings'];
  for (const field of jsonFields) {
    if (fund[field] && typeof fund[field] === 'string') {
      try { fund[field] = JSON.parse(fund[field]); } catch { fund[field] = null; }
    }
  }
  return fund;
}

export default function FundDetailPage({ initialData }) {
  const params = useParams();
  const { isin } = params;
  const t = useTranslations('fundDetail');

  const hasInitialData = initialData?.fund != null;
  const [fundData, setFundData] = useState(() => {
    if (hasInitialData) return parseJsonFields({ ...initialData.fund });
    return undefined;
  });
  const [priceHistory, setPriceHistory] = useState(() => {
    if (hasInitialData) return initialData.price_history;
    return undefined;
  });
  const [loading, setLoading] = useState(!hasInitialData);
  const [error, setError] = useState();
  const [selectedClass, setSelectedClass] = useState();
  const hasLoaded = useRef(hasInitialData);

  const fetchFundData = useCallback(async () => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/funds/${isin}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setFundData(parseJsonFields(data.fund));
      setPriceHistory(data.price_history);
    } catch (err) {
      console.error('Error fetching fund data:', err);
      setError(t('message.error'));
    } finally {
      setLoading(false);
    }
  }, [isin, t]);

  useEffect(() => {
    if (isin && !hasInitialData) {
      hasLoaded.current = false;
      fetchFundData();
    }
  }, [isin, fetchFundData, hasInitialData]);

  const formatDate = (dateString) => {
    const [day, month, year] = dateString.split('/');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleClassChange = (event) => {
    const selectedIsin = event.target.value;
    if (selectedIsin && selectedIsin !== isin) {
      window.location.href = `/fund/${selectedIsin}`;
    }
  };


  if (loading) {
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

  if (error || !fundData) {
    return notFound();
  }

  return (
    <>
      <div className="bg-[#fff1e0] min-h-screen">
        {/* Breaking News Banner */}
        <div className="bg-[#315b97] text-white py-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <span className="font-bold text-sm uppercase mr-4">{t('banner.title')}</span>
              <span className="text-sm">{t('banner.subtitle', { isin })}</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="border-b-4 border-black pb-4 mb-4">
            {/* Main Header Row */}
            <div className="flex items-start justify-between gap-4 mb-2">
              {/* Left Section - Title and Price */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-black leading-tight serif mb-2">
                  {fundData.long_name || fundData.short_name || t('message.notFound')}
                </h1>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-black text-[#fff1e0] px-2 py-1 font-bold text-xs uppercase tracking-wide">
                    {fundData.isin}
                  </span>
                  {fundData.benchmark_name && fundData.benchmark_id && (
                    <Link
                      href={`/benchmark/${fundData.benchmark_id}`}
                      className="bg-blue-600 text-white px-2 py-1 font-bold text-xs uppercase tracking-wide hover:underline"
                    >
                      {fundData.benchmark_name}
                    </Link>
                  )}
                </div>
              </div>

              {/* Right Section - Price and Manager */}
              <div className="text-right flex flex-col items-end space-y-1">
                <div className="text-xl md:text-2xl font-bold text-black serif">
                  {formatPrice(fundData.previous_close ?? fundData.price ?? 0, fundData.currency)}
                </div>
                <div className="text-xs text-gray-600 uppercase tracking-wide">
                  {t('header.lastPrice')}
                </div>
              </div>
            </div>

            {/* Secondary Row - Metadata and Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Left - Fund Classes */}
              <div className="flex-1 w-full md:w-auto">
                {fundData.classes && Array.isArray(fundData.classes) && fundData.classes.length > 1 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {t('header.fundClasses')}
                    </label>
                    <select
                      value={fundData.isin}
                      onChange={handleClassChange}
                      className="border-2 border-black px-2 py-1 bg-white text-black text-sm min-w-[200px]"
                    >
                      {fundData.classes.map((fundClass, idx) => (
                        <option key={idx} value={fundClass.isin}>
                          {fundClass.class_name} ({fundClass.isin})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Right - Manager and Metadata (desktop only) */}
              <div className="hidden md:flex items-center gap-4 text-sm">
                {fundData.manager_name && fundData.manager_id && (
                  <div className="flex items-center">
                    <span className="font-medium text-gray-600 mr-2">{t('header.manager')}</span>
                    <Link
                      href={`/manager/${fundData.manager_id}`}
                      className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium hover:underline"
                    >
                      {fundData.manager_name}
                    </Link>
                  </div>
                )}
              </div>

              {/* Manager and Metadata (mobile only, below fund classes) */}
              <div className="flex md:hidden flex-col w-full mt-2 text-sm">
                {fundData.manager_name && fundData.manager_id && (
                  <div className="flex items-center mb-1">
                    <span className="font-medium text-gray-600 mr-2">{t('header.manager')}</span>
                    <Link
                      href={`/manager/${fundData.manager_id}`}
                      className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium hover:underline"
                    >
                      {fundData.manager_name}
                    </Link>
                  </div>
                )}
                <div className="flex items-center text-gray-600 space-x-1">
                  <span className="text-xs text-gray-500">
                    {formatDate(fundData.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-3 gap-6 mb-4">
            <div className="bg-white border-2 border-black p-4 text-center">
              <div className="text-xs  text-gray-600 uppercase tracking-wide font-bold mb-2">
                {t('metrics.ytdReturn')}
              </div>
              <div className={`text-2xl font-bold serif ${getReturnColor(fundData.ytd_return)}`}>
                {formatReturn(fundData.ytd_return)}
              </div>
              <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">
                {t('metrics.ytdLabel')}
              </div>
            </div>

            <div className="bg-white border-2 border-black p-4 text-center">
              <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-2">
                {t('metrics.last90Days')}
              </div>
              <div className={`text-2xl font-bold serif ${getReturnColor(fundData.last_90d_return)}`}>
                {formatReturn(fundData.last_90d_return)}
              </div>
              <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">
                {t('metrics.quarterlyLabel')}
              </div>
            </div>

            <div className="bg-white border-2 border-black p-4 text-center">
              <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-2">
                {t('metrics.baseCurrency')}
              </div>
              <div className="text-2xl font-bold serif text-black">
                {fundData.currency || 'USD'}
              </div>
              <div className="text-xs text-gray-600 uppercase tracking-wide mt-1">
                {t('metrics.currencyLabel')}
              </div>
            </div>
          </div>

          {/* Price Chart */}
          {priceHistory && priceHistory.length > 0 && (
            <div className="bg-white border-2 border-black p-6 mb-4">
              <h3 className="text-2xl font-bold text-black serif mb-6 border-b-2 border-black pb-2">
                {t('priceChart.title')}
              </h3>
              <div className="h-96">
                <PriceChart
                  priceData={priceHistory}
                  isPositive={fundData.ytd_return >= 0}
                  mainFundPage={true}
                />
              </div>
              <div className="mt-4 text-sm text-gray-600 text-center">
                {t('priceChart.dataRange', { start: formatDate(priceHistory[0]?.date), end: formatDate(priceHistory[priceHistory.length - 1]?.date) })}
              </div>
            </div>
          )}

          {/* Fund Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
            {/* Basic Information */}
            <div className="bg-white border-2 border-black p-6">
              <h3 className="text-xl font-bold text-black serif mb-4 border-b-2 border-black pb-2">
                {t('basicInfo.title')}
              </h3>
              <div className="space-y-4">
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('basicInfo.fullName')}</div>
                  <div className="text-black font-medium">{fundData.long_name || 'N/A'}</div>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('basicInfo.shortName')}</div>
                  <div className="text-black font-medium">{fundData.short_name || 'N/A'}</div>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('basicInfo.region')}</div>
                  <div className="text-black font-medium">{fundData.region || 'N/A'}</div>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('basicInfo.dataSource')}</div>
                  <div className="text-black font-medium">{fundData.quote_source_name || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Fees Table */}
            {(fundData.management_fee || fundData.performance_fee || fundData.custody_fee ||
              fundData.ongoing_charges || fundData.redemption_fee || fundData.subscription_fee) && (
                <div className="bg-white border-2 border-black p-6">
                  <h3 className="text-xl font-bold text-black serif mb-4 border-b-2 border-black pb-2">
                    {t('fees.title')}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-black">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-black px-4 py-2 text-left text-xs font-bold uppercase tracking-wide">{t('fees.feeType')}</th>
                          <th className="border border-black px-4 py-2 text-right text-xs font-bold uppercase tracking-wide">{t('fees.value')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white">
                          <td className="border border-black px-4 py-2 font-medium">{t('fees.management')}</td>
                          <td className="border border-black px-4 py-2 text-right">{formatPercentage(fundData.management_fee)}</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-black px-4 py-2 font-medium">{t('fees.performance')}</td>
                          <td className="border border-black px-4 py-2 text-right">{formatPercentage(fundData.performance_fee)}</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="border border-black px-4 py-2 font-medium">{t('fees.custody')}</td>
                          <td className="border border-black px-4 py-2 text-right">{formatPercentage(fundData.custody_fee)}</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-black px-4 py-2 font-medium">{t('fees.ongoing')}</td>
                          <td className="border border-black px-4 py-2 text-right">{formatPercentage(fundData.ongoing_charges)}</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="border border-black px-4 py-2 font-medium">{t('fees.redemption')}</td>
                          <td className="border border-black px-4 py-2 text-right">{formatPercentage(fundData.redemption_fee)}</td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="border border-black px-4 py-2 font-medium">{t('fees.subscription')}</td>
                          <td className="border border-black px-4 py-2 text-right">{formatPercentage(fundData.subscription_fee)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Sector Weightings */}
            {fundData.sector_weightings && typeof fundData.sector_weightings === 'object' && Object.keys(fundData.sector_weightings).length > 0 && (
              <div className="bg-white border-2 border-black p-6">
                <h3 className="text-xl font-bold text-black serif mb-4 border-b-2 border-black pb-2">
                  {t('sectors.title')}
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-black">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black px-4 py-2 text-left text-xs font-bold uppercase tracking-wide">{t('sectors.sector')}</th>
                        <th className="border border-black px-4 py-2 text-right text-xs font-bold uppercase tracking-wide">{t('sectors.weight')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(fundData.sector_weightings).map(([sector, weight], idx) => (
                        <tr key={sector} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="border border-black px-4 py-2 capitalize">{sector.replace(/_/g, ' ')}</td>
                          <td className="border border-black px-4 py-2 text-right font-medium">
                            {formatPercentage(weight * 100)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {fundData.holdings && Array.isArray(fundData.holdings) && fundData.holdings.length > 0 && (
              <div className="bg-white border-2 border-black p-6">
                <h3 className="text-xl font-bold text-black serif mb-4 border-b-2 border-black pb-2">
                  {t('holdings.title')}
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-black">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black px-4 py-2 text-left text-xs font-bold uppercase tracking-wide">{t('holdings.name')}</th>
                        <th className="border border-black px-4 py-2 text-left text-xs font-bold uppercase tracking-wide">{t('holdings.symbol')}</th>
                        <th className="border border-black px-4 py-2 text-right text-xs font-bold uppercase tracking-wide">{t('holdings.percentage')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fundData.holdings.map((holding, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="border border-black px-4 py-2 font-medium">{holding.name || 'N/A'}</td>
                          <td className="border border-black px-4 py-2">{holding.symbol || 'N/A'}</td>
                          <td className="border border-black px-4 py-2 text-right font-medium">
                            {formatPercentage(parseFloat(holding["holding_percent"]) * 100)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Asset Classes */}
          {fundData.asset_classes && typeof fundData.asset_classes === 'object' && Object.keys(fundData.asset_classes).length > 0 && (
            <div className="bg-white border-2 border-black p-6 mb-8">
              <h3 className="text-xl font-bold text-black serif mb-4 border-b-2 border-black pb-2">
                {t('assetClasses.title')}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(fundData.asset_classes).map(([asset, value]) => (
                  <div key={asset} className="bg-gray-50 border border-black p-3 text-center">
                    <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1 capitalize">
                      {asset.replace('Position', '').replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-lg font-bold text-black">
                      {formatPercentage(value * 100)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bond Holdings */}
          {fundData.bond_holdings && Array.isArray(fundData.bond_holdings) && fundData.bond_holdings.length > 0 && (
            <div className="bg-white border-2 border-black p-6 mb-4">
              <h3 className="text-xl font-bold text-black serif mb-4 border-b-2 border-black pb-2">
                {t('bonds.title')}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-4 py-2 text-left text-xs font-bold uppercase tracking-wide">{t('bonds.metric')}</th>
                      <th className="border border-black px-4 py-2 text-left text-xs font-bold uppercase tracking-wide">{t('bonds.value')}</th>
                      <th className="border border-black px-4 py-2 text-left text-xs font-bold uppercase tracking-wide">{t('bonds.categoryAverage')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundData.bond_holdings.map((bond, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border border-black px-4 py-2 font-medium">{bond.Average}</td>
                        <td className="border border-black px-4 py-2">{bond['0P0001JS2K'] || 'N/A'}</td>
                        <td className="border border-black px-4 py-2">{bond['Category Average'] || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Equity Holdings */}
          {fundData.equity_holdings && Array.isArray(fundData.equity_holdings) && fundData.equity_holdings.length > 0 && (
            <div className="bg-white border-2 border-black p-6 mb-4">
              <h3 className="text-xl font-bold text-black serif mb-4 border-b-2 border-black pb-2">
                {t('equity.title')}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-4 py-2 text-left text-xs font-bold uppercase tracking-wide">{t('equity.metric')}</th>
                      <th className="border border-black px-4 py-2 text-left text-xs font-bold uppercase tracking-wide">{t('equity.value')}</th>
                      <th className="border border-black px-4 py-2 text-left text-xs font-bold uppercase tracking-wide">{t('equity.categoryAverage')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fundData.equity_holdings.map((equity, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="border border-black px-4 py-2 font-medium">{equity.Average}</td>
                        <td className="border border-black px-4 py-2">{equity['0P0000TFEW'] || 'N/A'}</td>
                        <td className="border border-black px-4 py-2">{equity['Category Average'] || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Additional Information */}
          <div className="bg-white border-2 border-black p-6 mb-4">
            <h3 className="text-xl font-bold text-black serif mb-4 border-b-2 border-black pb-2">
              {t('additionalInfo.title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('additionalInfo.benchmark')}</div>
                  <div className="text-black font-medium">{fundData.benchmark || 'N/A'}</div>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('additionalInfo.fundAssets')}</div>
                  <div className="text-black font-medium">{fundData.fund_assets || 'N/A'}</div>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('additionalInfo.classAssets')}</div>
                  <div className="text-black font-medium">{fundData.class_assets || 'N/A'}</div>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('additionalInfo.startDate')}</div>
                  <div className="text-black font-medium">{fundData.start_date || 'N/A'}</div>
                </div>
              </div>
              <div className="space-y-4">
                {fundData.fund_overview && (
                  <div className="border-l-4 border-black pl-4">
                    <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('additionalInfo.fundInfo')}</div>
                    <div className="text-black font-medium">
                      {t('additionalInfo.family')} {fundData.fund_overview.family || 'N/A'}
                    </div>
                  </div>
                )}
                {fundData.bond_ratings && typeof fundData.bond_ratings === 'object' && (
                  <div className="border-l-4 border-black pl-4">
                    <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('additionalInfo.bondRatings')}</div>
                    <div className="text-black font-medium">
                      {Object.entries(fundData.bond_ratings).map(([rating, value]) => (
                        <div key={rating} className="text-sm">
                          {rating.toUpperCase()}: {formatPercentage(value * 100)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t-4 border-black pt-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/fondos"
              className="bg-gray-200 text-black px-6 py-3 font-bold text-sm transition-colors duration-200 hover:bg-gray-300 uppercase tracking-wide text-center"
            >
              {t('navigation.backToFunds')}
            </Link>
            <Link
              href="/chat"
              className="bg-black text-[#fff1e0] px-6 py-3 font-bold text-sm transition-colors duration-200 hover:bg-gray-800 uppercase tracking-wide text-center"
            >
              {t('navigation.consultAI')}
            </Link>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-gray-100 border-t-2 border-black p-6 mt-4">
          <div className="text-xs text-gray-700 leading-relaxed text-center">
            <strong>{t('disclaimer.title')}</strong> {t('disclaimer.text')}
          </div>
        </div>
      </div>
    </>
  );
}

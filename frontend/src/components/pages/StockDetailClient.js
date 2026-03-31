'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import PriceChart from '@/components/PriceChart';
import { formatPrice, formatReturn, getReturnColor, formatNumber, formatPercentage, formatBigNumber } from '@/lib/utils';

import { API_BASE_URL } from '@/config/api';

export default function StockDetailPage({ initialData }) {
  const params = useParams();
  const { ticker: encodedTicker } = params;
  const ticker = decodeURIComponent(encodedTicker);
  const t = useTranslations('stockDetail');

  const hasInitialData = initialData?.stock != null;
  const [stockData, setStockData] = useState(() => hasInitialData ? initialData.stock : undefined);
  const [priceHistory, setPriceHistory] = useState(() => hasInitialData ? initialData.price_history : undefined);
  const [loading, setLoading] = useState(!hasInitialData);
  const [error, setError] = useState();
  const hasLoaded = useRef(hasInitialData);

  const fetchStockData = useCallback(async () => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/stock/${ticker}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      setStockData(data.stock);
      setPriceHistory(data.price_history);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError(t('message.error'));
    } finally {
      setLoading(false);
    }
  }, [ticker, t]);

  useEffect(() => {
    if (ticker && !hasInitialData) {
      hasLoaded.current = false;
      fetchStockData();
    }
  }, [ticker, fetchStockData, hasInitialData]);

  const formatDate = (dateString) => {
    const [day, month, year] = dateString.split('/');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };


  const calculateReturn = (priceHistory, days) => {
    if (!priceHistory || priceHistory.length < 2) return null;

    const currentPrice = parseFloat(priceHistory[priceHistory.length - 1].close_price);
    if (isNaN(currentPrice)) return null;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Find the closest historical price on or before the start date
    // Sort by date descending to find the most recent price before startDate
    const historicalPrice = priceHistory
      .filter(p => new Date(p.date) <= startDate)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    
    if (!historicalPrice) return null;

    const oldPrice = parseFloat(historicalPrice.close_price);
    if (isNaN(oldPrice) || oldPrice === 0) return null;

    return ((currentPrice - oldPrice) / oldPrice) * 100;
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

  if (error || !stockData) {
    return notFound();
  }

  const ytdReturn = calculateReturn(priceHistory, 365);
  const ninetyDayReturn = calculateReturn(priceHistory, 90);

  return (
    <>
      <div className="bg-[#fff1e0] min-h-screen">
        {/* Breaking News Banner */}
        <div className="bg-[#315b97] text-white py-2">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <span className="font-bold text-sm uppercase mr-4">{t('banner.title')}</span>
              <span className="text-sm">{t('banner.subtitle', { ticker: stockData.symbol })}</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="border-b-4 border-black pb-4 mb-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-black leading-tight serif mb-2">
                  {stockData.symbol}
                </h1>
                <div className="flex items-center gap-2 mb-2">
                  {stockData.sector && (
                    <span className="bg-black text-[#fff1e0] px-2 py-1 font-bold text-xs uppercase tracking-wide">
                      {stockData.sector}
                    </span>
                  )}
                  {stockData.industry && (
                    <span className="bg-blue-600 text-white px-2 py-1 font-bold text-xs uppercase tracking-wide">
                      {stockData.industry}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {stockData.exchange && <span>{stockData.exchange}</span>}
                  {stockData.country && <span> • {stockData.country}</span>}
                </div>
              </div>

              <div className="text-right flex flex-col items-end space-y-1">
                <div className="text-xl md:text-2xl font-bold text-black serif">
                  {formatPrice(stockData.currentPrice ?? 0, stockData.currency)}
                </div>
                <div className="text-xs text-gray-600 uppercase tracking-wide">
                  {t('header.currentPrice')}
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-4">
            <div className="bg-white border-2 border-black p-4 text-center">
              <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-2">
                {t('metrics.marketCap')}
              </div>
              <div className="text-2xl font-bold serif text-black">
                {formatBigNumber(stockData.marketCap)}
              </div>
            </div>

            <div className="bg-white border-2 border-black p-4 text-center">
              <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-2">
                {t('metrics.peRatio')}
              </div>
              <div className="text-2xl font-bold serif text-black">
                {formatNumber(stockData.trailingPE)}
              </div>
            </div>

            <div className="bg-white border-2 border-black p-4 text-center">
              <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-2">
                {t('metrics.ytdReturn')}
              </div>
              <div className={`text-2xl font-bold serif ${getReturnColor(ytdReturn)}`}>
                {formatReturn(ytdReturn)}
              </div>
            </div>

            <div className="bg-white border-2 border-black p-4 text-center">
              <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-2">
                {t('metrics.90DayReturn')}
              </div>
              <div className={`text-2xl font-bold serif ${getReturnColor(ninetyDayReturn)}`}>
                {formatReturn(ninetyDayReturn)}
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
                  isPositive={(ytdReturn || 0) >= 0}
                  mainFundPage={true}
                  currency={stockData.currency}
                />
              </div>
              <div className="mt-4 text-sm text-gray-600 text-center">
                {t('priceChart.dataRange', {
                  start: formatDate(priceHistory[0]?.date),
                  end: formatDate(priceHistory[priceHistory.length - 1]?.date),
                  count: priceHistory.length
                })}
              </div>
            </div>
          )}

          {/* Stock Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
            {/* Company Information */}
            <div className="bg-white border-2 border-black p-6">
              <h3 className="text-xl font-bold text-black serif mb-4 border-b-2 border-black pb-2">
                {t('companyInfo.title')}
              </h3>
              <div className="space-y-4">
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('companyInfo.sector')}</div>
                  <div className="text-black font-medium">{stockData.sector || 'N/A'}</div>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('companyInfo.industry')}</div>
                  <div className="text-black font-medium">{stockData.industry || 'N/A'}</div>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('companyInfo.country')}</div>
                  <div className="text-black font-medium">{stockData.country || 'N/A'}</div>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('companyInfo.employees')}</div>
                  <div className="text-black font-medium">{stockData.fullTimeEmployees?.toLocaleString() || 'N/A'}</div>
                </div>
                {stockData.website && (
                  <div className="border-l-4 border-black pl-4">
                    <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('companyInfo.website')}</div>
                    <a href={stockData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                      {stockData.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Valuation Metrics */}
            <div className="bg-white border-2 border-black p-6">
              <h3 className="text-xl font-bold text-black serif mb-4 border-b-2 border-black pb-2">
                {t('valuation.title')}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-black">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-4 py-2 text-left text-xs font-bold uppercase tracking-wide">{t('valuation.metric')}</th>
                      <th className="border border-black px-4 py-2 text-right text-xs font-bold uppercase tracking-wide">{t('valuation.value')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="border border-black px-4 py-2 font-medium">{t('valuation.trailingPE')}</td>
                      <td className="border border-black px-4 py-2 text-right">{formatNumber(stockData.trailingPE)}</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-black px-4 py-2 font-medium">{t('valuation.forwardPE')}</td>
                      <td className="border border-black px-4 py-2 text-right">{formatNumber(stockData.forwardPE)}</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="border border-black px-4 py-2 font-medium">{t('valuation.priceToBook')}</td>
                      <td className="border border-black px-4 py-2 text-right">{formatNumber(stockData.priceToBook)}</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-black px-4 py-2 font-medium">{t('valuation.beta')}</td>
                      <td className="border border-black px-4 py-2 text-right">{formatNumber(stockData.beta)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Performance */}
            <div className="bg-white border-2 border-black p-6">
              <h3 className="text-xl font-bold text-black serif mb-4 border-b-2 border-black pb-2">
                {t('financial.title')}
              </h3>
              <div className="space-y-4">
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('financial.revenue')}</div>
                  <div className="text-black font-medium">{formatBigNumber(stockData.totalRevenue)}</div>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('financial.netIncome')}</div>
                  <div className="text-black font-medium">{formatBigNumber(stockData.netIncomeToCommon)}</div>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('financial.profitMargin')}</div>
                  <div className="text-black font-medium">{formatPercentage(stockData.profitMargins != null ? stockData.profitMargins * 100 : null)}</div>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('financial.roe')}</div>
                  <div className="text-black font-medium">{formatPercentage(stockData.returnOnEquity != null ? stockData.returnOnEquity * 100 : null)}</div>
                </div>
              </div>
            </div>

            {/* Growth & Risk */}
            <div className="bg-white border-2 border-black p-6">
              <h3 className="text-xl font-bold text-black serif mb-4 border-b-2 border-black pb-2">
                {t('growth.title')}
              </h3>
              <div className="space-y-4">
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('growth.revenueGrowth')}</div>
                  <div className="text-black font-medium">{formatPercentage(stockData.revenueGrowth != null ? stockData.revenueGrowth * 100 : null)}</div>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('growth.earningsGrowth')}</div>
                  <div className="text-black font-medium">{formatPercentage(stockData.earningsGrowth != null ? stockData.earningsGrowth * 100 : null)}</div>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('growth.52WeekHigh')}</div>
                  <div className="text-black font-medium">{formatPrice(stockData.fiftyTwoWeekHigh, stockData.currency)}</div>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('growth.52WeekLow')}</div>
                  <div className="text-black font-medium">{formatPrice(stockData.fiftyTwoWeekLow, stockData.currency)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Business Summary */}
          {stockData.longBusinessSummary && (
            <div className="bg-white border-2 border-black p-6 mb-4">
              <h3 className="text-xl font-bold text-black serif mb-4 border-b-2 border-black pb-2">
                {t('summary.title')}
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {stockData.longBusinessSummary}
              </p>
            </div>
          )}

          {/* Analyst Recommendations */}
          {stockData.recommendationKey && (
            <div className="bg-white border-2 border-black p-6 mb-4">
              <h3 className="text-xl font-bold text-black serif mb-4 border-b-2 border-black pb-2">
                {t('analyst.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('analyst.recommendation')}</div>
                  <div className="text-black font-medium uppercase">{stockData.recommendationKey || 'N/A'}</div>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('analyst.targetPrice')}</div>
                  <div className="text-black font-medium">{formatPrice(stockData.targetMeanPrice, stockData.currency)}</div>
                </div>
                <div className="border-l-4 border-black pl-4">
                  <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">{t('analyst.numAnalysts')}</div>
                  <div className="text-black font-medium">{stockData.numberOfAnalystOpinions || 'N/A'}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 border-t-4 border-black pt-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/stock"
              className="bg-gray-200 text-black px-6 py-3 font-bold text-sm transition-colors duration-200 hover:bg-gray-300 uppercase tracking-wide text-center"
            >
              {t('navigation.backToStocks')}
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

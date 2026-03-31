'use client';

import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import PriceChart from '../PriceChart';
import { formatNumber, formatBigNumber } from '@/lib/utils';

export default function StockInfo({ ticker }) {
  const { getSessionToken } = useAuth();
  const { data: stockInfo, loading, error, fetchData } = useApi();

  useEffect(() => {
    if (ticker) {
      fetchData(`/api/chat/artifacts/stock-info/${ticker}`, {
        auth: true,
        getSessionToken,
      });
    }
  }, [ticker]);

  if (loading || !stockInfo) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
          <span>Loading stock chart...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-2 border-red-600 p-6 mb-8">
        <div className="flex items-center">
          <div className="text-red-600 font-bold mr-3">⚠️</div>
          <div>
            <h3 className="text-lg font-bold text-red-800 serif">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const priceHistory = stockInfo.price_history;
  const stock = stockInfo.stock_info;

  // Calculate if positive based on 1Y return
  let isPositive = true;
  let yearReturn = 0;
  if (priceHistory && priceHistory.length >= 2) {
    const firstPrice = parseFloat(priceHistory[0].close_price);
    const lastPrice = parseFloat(priceHistory[priceHistory.length - 1].close_price);
    isPositive = lastPrice >= firstPrice;
    yearReturn = ((lastPrice - firstPrice) / firstPrice) * 100;
  }

  const formatPercent = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatStockPrice = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `${stock.currency} ${Number(value).toFixed(2)}`;
  };

  const getRecommendationColor = (rec) => {
    if (!rec) return 'text-gray-600';
    const lower = rec.toLowerCase();
    if (lower === 'strong buy' || lower === 'buy') return 'text-green-600 font-bold';
    if (lower === 'hold') return 'text-yellow-600 font-bold';
    if (lower === 'sell' || lower === 'strong sell') return 'text-red-600 font-bold';
    return 'text-gray-600';
  };

  const formatRecommendation = (rec) => {
    if (!rec) return 'N/A';
    return rec.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Price Chart */}
      <div className="bg-gray-50 p-3 rounded">
        <PriceChart
          priceData={priceHistory}
          isPositive={isPositive}
          chatArtifact={true}
          mainFundPage={true}
          currency={stock.currency}
        />
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-white border border-gray-200 p-3 rounded">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current Price</div>
          <div className="text-lg font-bold text-black tabular-nums">{formatStockPrice(stock.current_price)}</div>
        </div>

        <div className="bg-white border border-gray-200 p-3 rounded">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">1Y Return</div>
          <div className={`text-lg font-bold tabular-nums ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {yearReturn >= 0 ? '+' : ''}{yearReturn.toFixed(2)}%
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3 rounded">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Market Cap</div>
          <div className="text-base font-bold text-black tabular-nums">{formatBigNumber(stock.market_cap)}</div>
        </div>

        <div className="bg-white border border-gray-200 p-3 rounded">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">52W Range</div>
          <div className="text-sm text-black tabular-nums">
            {formatStockPrice(stock.fifty_two_week_low)} - {formatStockPrice(stock.fifty_two_week_high)}
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3 rounded">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">P/E Ratio</div>
          <div className="text-base font-bold text-black tabular-nums">{formatNumber(stock.trailing_pe)}</div>
        </div>

        <div className="bg-white border border-gray-200 p-3 rounded">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Forward P/E</div>
          <div className="text-base font-bold text-black tabular-nums">{formatNumber(stock.forward_pe)}</div>
        </div>

        <div className="bg-white border border-gray-200 p-3 rounded">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Price/Book</div>
          <div className="text-base font-bold text-black tabular-nums">{formatNumber(stock.price_to_book)}</div>
        </div>

        <div className="bg-white border border-gray-200 p-3 rounded">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Beta</div>
          <div className="text-base font-bold text-black tabular-nums">{formatNumber(stock.beta, 3)}</div>
        </div>

        <div className="bg-white border border-gray-200 p-3 rounded">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Profit Margin</div>
          <div className="text-base font-bold text-black tabular-nums">{formatPercent(stock.profit_margins)}</div>
        </div>

        <div className="bg-white border border-gray-200 p-3 rounded">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">ROE</div>
          <div className="text-base font-bold text-black tabular-nums">{formatPercent(stock.return_on_equity)}</div>
        </div>

        <div className="bg-white border border-gray-200 p-3 rounded">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Debt/Equity</div>
          <div className="text-base font-bold text-black tabular-nums">{formatNumber(stock.debt_to_equity)}</div>
        </div>

        <div className="bg-white border border-gray-200 p-3 rounded">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current Ratio</div>
          <div className="text-base font-bold text-black tabular-nums">{formatNumber(stock.current_ratio, 2)}</div>
        </div>
      </div>

      {/* Analyst Recommendation */}
      {stock.recommendation_key && (
        <div className="bg-white border border-gray-200 p-3 rounded">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Analyst Rating</div>
              <div className={`text-base font-bold ${getRecommendationColor(stock.recommendation_key)}`}>
                {formatRecommendation(stock.recommendation_key)}
              </div>
              {stock.number_of_analyst_opinions && (
                <div className="text-xs text-gray-500 mt-1">
                  Based on {stock.number_of_analyst_opinions} analysts
                </div>
              )}
            </div>
            {stock.target_mean_price && (
              <div className="text-right">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Price Target</div>
                <div className="text-base font-bold text-black tabular-nums">{formatStockPrice(stock.target_mean_price)}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

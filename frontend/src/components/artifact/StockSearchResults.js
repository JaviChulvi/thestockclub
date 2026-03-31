'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '@/i18n/navigation';
import { useApi } from '@/hooks/useApi';
import PriceChart from '../PriceChart';
import { formatPrice } from '@/lib/utils';

export default function StockSearchResults({ isin }) {
  const { getSessionToken } = useAuth();
  const t = useTranslations('stockCard');
  const router = useRouter();
  const { data: stocksData, loading, error, fetchData } = useApi();

  // Parse the filter params from isin (which is a JSON string)
  const filterParams = (() => {
    try {
      return JSON.parse(isin);
    } catch (e) {
      console.error('Failed to parse filter params:', e);
      return {};
    }
  })();

  useEffect(() => {
    if (isin) {
      const params = new URLSearchParams();
      if (filterParams.country) params.append('country', filterParams.country);
      if (filterParams.sector) params.append('sector', filterParams.sector);
      params.append('limit', '10');

      fetchData(`/api/stock/filter?${params.toString()}`, {
        auth: true,
        getSessionToken,
        transform: (result) => result.stocks || [],
      });
    }
  }, [isin]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
          <span>Loading stocks...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-400 text-sm">
        <div className="text-center">
          <div className="mb-2">Error</div>
          <div className="text-xs text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  if (!stocksData || stocksData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        No stocks found
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="bg-white border-2 border-black overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-black bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Stock</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Price</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Market Cap</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">P/E</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Fwd P/E</th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">1Y Return</th>
                <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">90-Day Chart</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stocksData.map((stock) => {
                const oneYearReturn = stock.oneYearReturn;
                const priceHistory = stock.last_90d_price_history;
                let changeIsPositive = (stock.changePercent || 0) >= 0;
                if (priceHistory && priceHistory.length > 1) {
                  const sortedHistory = [...priceHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
                  const firstPrice = parseFloat(sortedHistory[0].close_price);
                  const lastPrice = parseFloat(sortedHistory[sortedHistory.length - 1].close_price);
                  changeIsPositive = lastPrice >= firstPrice;
                }

                return (
                  <tr
                    key={stock.id || stock.symbol}
                    onClick={() => router.push(`/stock/${encodeURIComponent(stock.symbol)}`)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <h3 className="text-blue-600 hover:text-blue-800 font-bold text-lg serif leading-tight mb-0.5">
                          {stock.symbol}
                        </h3>
                        <div className="flex items-center space-x-1.5 mb-0.5">
                          {stock.sector && (
                            <span className="bg-black text-[#fff1e0] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                              {stock.sector}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1.5 text-[11px] text-gray-600">
                          <span>{stock.country || 'Global'}</span>
                          <span>•</span>
                          <span>{stock.currency || 'USD'}</span>
                          {stock.exchange && (
                            <>
                              <span>•</span>
                              <span>{stock.exchange}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="text-sm font-bold text-black tabular-nums whitespace-nowrap">
                        {formatPrice(stock.price ?? 0, stock.currency)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="text-sm font-bold text-black tabular-nums whitespace-nowrap">
                        {stock.marketCap ? `$${(stock.marketCap / 1e9).toFixed(2)}B` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="text-sm font-bold text-black tabular-nums whitespace-nowrap">
                        {stock.trailingPE !== null && stock.trailingPE !== undefined ? stock.trailingPE.toFixed(2) : '-'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="text-sm font-bold text-black tabular-nums whitespace-nowrap">
                        {stock.forwardPE !== null && stock.forwardPE !== undefined ? stock.forwardPE.toFixed(2) : '-'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className={`text-sm font-bold tabular-nums ${(oneYearReturn || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {oneYearReturn !== null && oneYearReturn !== undefined
                          ? `${(oneYearReturn || 0) >= 0 ? '+' : ''}${oneYearReturn.toFixed(2)}%`
                          : 'N/A'
                        }
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="w-48 h-16">
                        {stock.last_90d_price_history && stock.last_90d_price_history.length > 0 ? (
                          <PriceChart priceData={stock.last_90d_price_history} isPositive={changeIsPositive} />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400 text-xs">N/A</div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

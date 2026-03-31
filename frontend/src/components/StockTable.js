'use client';

import { useCallback } from 'react';
import PriceChart from './PriceChart';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/utils';
import { useSortableData } from '@/hooks/useSortableData';
import SortIcon from './SortIcon';

function StockTable({ stocks }) {
  const t = useTranslations('stockCard');
  const router = useRouter();

  const getValueFn = useCallback((stock, key) => {
    switch (key) {
      case 'symbol': return (stock.symbol || '').toLowerCase();
      case 'price': return stock.price ?? 0;
      case 'marketCap': return stock.marketCap ?? 0;
      case 'trailingPE': return stock.trailingPE ?? Infinity;
      case 'forwardPE': return stock.forwardPE ?? Infinity;
      case 'dividendYield': return stock.dividendYield ?? -Infinity;
      case 'oneYear': return stock.oneYearReturn ?? -Infinity;
      default: return 0;
    }
  }, []);

  const { sortedItems: sortedStocks, sortConfig, handleSort } = useSortableData(stocks, getValueFn);

  return (
    <div className="bg-white border-2 border-black overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-black bg-gray-50">
              <th
                className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('symbol')}
              >
                <div className="flex items-center">
                  Stock
                  <SortIcon columnKey="symbol" sortConfig={sortConfig} />
                </div>
              </th>
              <th
                className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center justify-end">
                  Price
                  <SortIcon columnKey="price" sortConfig={sortConfig} />
                </div>
              </th>
              <th
                className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('marketCap')}
              >
                <div className="flex items-center justify-end">
                  Market Cap
                  <SortIcon columnKey="marketCap" sortConfig={sortConfig} />
                </div>
              </th>
              <th
                className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('trailingPE')}
              >
                <div className="flex items-center justify-end">
                  P/E
                  <SortIcon columnKey="trailingPE" sortConfig={sortConfig} />
                </div>
              </th>
              <th
                className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('forwardPE')}
              >
                <div className="flex items-center justify-end">
                  Fwd P/E
                  <SortIcon columnKey="forwardPE" sortConfig={sortConfig} />
                </div>
              </th>
              <th
                className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('oneYear')}
              >
                <div className="flex items-center justify-end">
                  1Y Return
                  <SortIcon columnKey="oneYear" sortConfig={sortConfig} />
                </div>
              </th>
              <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                90-Day Chart
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedStocks.map((stock) => {
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
  );
}

export default StockTable;

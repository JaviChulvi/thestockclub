'use client';

import { useCallback } from 'react';
import PriceChart from './PriceChart';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/utils';
import { useSortableData } from '@/hooks/useSortableData';
import SortIcon from './SortIcon';

function FundTable({ funds }) {
  const t = useTranslations('fundCard');
  const router = useRouter();

  const getValueFn = useCallback((fund, key) => {
    switch (key) {
      case 'name': return (fund.long_name || fund.name || '').toLowerCase();
      case 'price': return fund.previous_close ?? fund.price ?? 0;
      case 'ytd': return fund.ytd_return ?? fund.ytdReturn ?? -Infinity;
      case '90d': return fund.last_90d_return ?? fund.ninety_d_return ?? -Infinity;
      default: return 0;
    }
  }, []);

  const { sortedItems: sortedFunds, sortConfig, handleSort } = useSortableData(funds, getValueFn);

  return (
    <div className="bg-white border-2 border-black overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-black bg-gray-50">
              <th
                className="px-3 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Fund
                  <SortIcon columnKey="name" sortConfig={sortConfig} />
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
                onClick={() => handleSort('ytd')}
              >
                <div className="flex items-center justify-end">
                  YTD Return
                  <SortIcon columnKey="ytd" sortConfig={sortConfig} />
                </div>
              </th>
              <th
                className="px-3 py-2 text-right text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('90d')}
              >
                <div className="flex items-center justify-end">
                  90D Return
                  <SortIcon columnKey="90d" sortConfig={sortConfig} />
                </div>
              </th>
              <th className="px-3 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                90-Day Chart
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedFunds.map((fund) => {
              const ytdReturn = fund.ytd_return ?? fund.ytdReturn;
              const ninetyDReturn = fund.last_90d_return ?? fund.ninety_d_return;
              const ytdIsPositive = ytdReturn >= 0;

              const priceHistory = fund.last_90d_price_history;
              let ninetyDIsPositive = ninetyDReturn >= 0;
              if (priceHistory && priceHistory.length > 1) {
                const sortedHistory = [...priceHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
                const firstPrice = parseFloat(sortedHistory[0].close_price);
                const lastPrice = parseFloat(sortedHistory[sortedHistory.length - 1].close_price);
                ninetyDIsPositive = lastPrice >= firstPrice;
              }

              return (
                <tr
                  key={fund.id || fund.isin}
                  onClick={() => router.push(`/fund/${fund.isin}`)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-3 py-2">
                    <div className="flex flex-col">
                      <h3 className="text-blue-600 hover:text-blue-800 font-bold text-lg serif leading-tight mb-0.5">
                        {fund.long_name || fund.name}
                      </h3>
                      <div className="flex items-center space-x-1.5 mb-0.5">
                        <span className="text-gray-600 text-[11px] font-mono">{fund.isin}</span>
                        {fund.type_disp && (
                          <span className="bg-black text-[#fff1e0] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                            {fund.type_disp}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5 text-[11px] text-gray-600">
                        <span>{fund.region || 'Global'}</span>
                        <span>•</span>
                        <span>{fund.currency || 'USD'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="text-sm font-bold text-black tabular-nums whitespace-nowrap">
                      {formatPrice(fund.previous_close ?? fund.price ?? 0, fund.currency)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className={`text-sm font-bold tabular-nums ${ytdIsPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {ytdReturn !== null && ytdReturn !== undefined
                        ? `${ytdIsPositive ? '+' : ''}${ytdReturn.toFixed(2)}%`
                        : 'N/A'
                      }
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className={`text-sm font-bold tabular-nums ${ninetyDIsPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {ninetyDReturn !== null && ninetyDReturn !== undefined
                        ? `${ninetyDIsPositive ? '+' : ''}${ninetyDReturn.toFixed(2)}%`
                        : 'N/A'
                      }
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="w-48 h-16">
                      {fund.last_90d_price_history ? (
                        <PriceChart priceData={fund.last_90d_price_history} isPositive={ninetyDIsPositive} />
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

export default FundTable;

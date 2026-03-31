'use client';

import { memo } from 'react';
import PriceChart from './PriceChart';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/utils';

function StockCard({ stock }) {
  const t = useTranslations('stockCard');
  const changeIsPositive = (stock.changePercent || 0) >= 0;

  return (
    <div className="bg-white border-2 border-black transition-all duration-200 hover:shadow-lg hover:shadow-black/10 flex flex-col h-full">
      {/* Header with newspaper styling */}
      <div className="border-b-2 border-black p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-black font-bold text-lg mb-1 serif leading-tight">
              {stock.symbol}
            </h3>
            <div className="flex items-center space-x-2 mb-2">
              {stock.sector && (
                <span className="bg-black text-[#fff1e0] px-2 py-1 text-xs font-bold uppercase tracking-wide">
                  {stock.sector}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-600">
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
          <div className="text-right">
            <div className="text-lg font-bold text-black serif">
              {formatPrice(stock.price ?? 0, stock.currency)}
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 mt-auto">
        {/* Chart Section - flexible height */}
        {stock.last_90d_price_history && stock.last_90d_price_history.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-300 flex-grow">
            <PriceChart priceData={stock.last_90d_price_history} isPositive={changeIsPositive} />
          </div>
        )}

        {/* Stock Metrics - Always at bottom */}
        <div className="grid grid-cols-2 gap-4 pt-3">
          <div>
            <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">
              {t('label.marketCap')}
            </div>
            <div className="text-lg font-bold serif text-black">
              {stock.marketCap
                ? `$${(stock.marketCap / 1e9).toFixed(2)}B`
                : 'N/A'
              }
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">
              {t('label.oneYearReturn')}
            </div>
            <div className={`text-lg font-bold serif ${
              (stock.oneYearReturn || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stock.oneYearReturn !== null && stock.oneYearReturn !== undefined
                ? `${(stock.oneYearReturn || 0) >= 0 ? '+' : ''}${stock.oneYearReturn.toFixed(2)}%`
                : 'N/A'
              }
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Link href={`/stock/${encodeURIComponent(stock.symbol)}`}>
          <p className="block w-full mt-3 bg-black text-[#fff1e0] py-2 font-bold text-sm transition-all duration-200 hover:bg-gray-800 uppercase tracking-wide text-center rounded">
            {t('button.viewFullAnalysis')}
          </p>
        </Link>
      </div>
    </div>
  );
}

export default memo(StockCard);

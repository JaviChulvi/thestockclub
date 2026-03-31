'use client';

import { memo } from 'react';
import PriceChart from './PriceChart';
import { Link } from '@/i18n/navigation';
import {useTranslations} from 'next-intl';
import { formatPrice } from '@/lib/utils';

function FundCard({ fund }) {
  const t = useTranslations('fundCard');
  const ytdIsPositive = fund.ytdReturn >= 0;
  const ninetyDIsPositive = fund.ninety_d_return >= 0;
  
  return (
    <div className="bg-white border-2 border-black transition-all duration-200 hover:shadow-lg hover:shadow-black/10 flex flex-col h-full">
      {/* Header with newspaper styling */}
      <div className="border-b-2 border-black p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-black font-bold text-lg mb-1 serif leading-tight">
              {fund.long_name || fund.name}
            </h3>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-gray-600 text-sm font-mono">{fund.isin}</span>
              {fund.type_disp && (
                <span className="bg-black text-[#fff1e0] px-2 py-1 text-xs font-bold uppercase tracking-wide">
                  {fund.type_disp}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <span>{fund.region || 'Global'}</span>
              <span>•</span>
              <span>{fund.currency || 'USD'}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-black serif">
              {formatPrice(fund.previous_close ?? fund.price ?? 0, fund.currency)}
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 mt-auto">
        {/* Chart Section - flexible height */}
        {fund.last_90d_price_history && (
          <div className="px-4 py-3 border-b border-gray-300 flex-grow">
            <PriceChart priceData={fund.last_90d_price_history} isPositive={ninetyDIsPositive} />
          </div>
        )}

        {/* Performance Metrics - Always at bottom */}
        <div className="grid grid-cols-2 gap-4 pt-3">
          <div>
            <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">
              {t('label.ytdReturn')}
            </div>
            <div className={`text-lg font-bold serif ${
              ytdIsPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {fund.ytd_return !== null && fund.ytd_return !== undefined 
                ? `${ytdIsPositive ? '+' : ''}${fund.ytd_return.toFixed(2)}%`
                : fund.ytdReturn !== null && fund.ytdReturn !== undefined
                ? `${ytdIsPositive ? '+' : ''}${fund.ytdReturn}%`
                : 'N/A'
              }
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600 uppercase tracking-wide font-bold mb-1">
              {t('label.last90Days')}
            </div>
            <div className={`text-lg font-bold serif ${
              ninetyDIsPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {fund.last_90d_return !== null && fund.last_90d_return !== undefined
                ? `${ninetyDIsPositive ? '+' : ''}${fund.last_90d_return.toFixed(2)}%`
                : fund.ninety_d_return !== null && fund.ninety_d_return !== undefined
                ? `${ninetyDIsPositive ? '+' : ''}${fund.ninety_d_return}%`
                : 'N/A'
              }
            </div>
          </div>
        </div>
        
        {/* Action Button */}
        <Link href={`/fund/${fund.isin}`}>
          <p className="block w-full mt-3 bg-black text-[#fff1e0] py-2 font-bold text-sm transition-all duration-200 hover:bg-gray-800 uppercase tracking-wide text-center rounded">
            {t('button.viewFullAnalysis')}
          </p>
        </Link>
      </div>
    </div>
  );
}

export default memo(FundCard);

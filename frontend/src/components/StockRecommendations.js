'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function StockRecommendations({ recommendations }) {
  const t = useTranslations('stockRecommendations');
  const [activeTab, setActiveTab] = useState(0);
  
  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  const currentRecommendation = recommendations[activeTab];

  // Map period string to translation key
  const getPeriodTranslationKey = (period) => {
    const periodLower = period.toLowerCase();
    if (periodLower === 'current') return 'period.current';
    if (periodLower.includes('1 month')) return 'period.oneMonth';
    if (periodLower.includes('2 month')) return 'period.twoMonths';
    if (periodLower.includes('3 month')) return 'period.threeMonths';
    return period; // fallback to original if not matched
  };

  // Get sentiment color based on net score
  const getSentimentColor = (score) => {
    if (score >= 40) return 'text-green-600';
    if (score >= 20) return 'text-green-500';
    if (score >= 0) return 'text-yellow-600';
    if (score >= -20) return 'text-orange-500';
    return 'text-red-600';
  };

  const getSentimentBg = (score) => {
    if (score >= 40) return 'bg-green-50';
    if (score >= 20) return 'bg-green-50';
    if (score >= 0) return 'bg-yellow-50';
    if (score >= -20) return 'bg-orange-50';
    return 'bg-red-50';
  };

  const getSentimentLabel = (score) => {
    if (score >= 40) return t('sentiment.veryPositive');
    if (score >= 20) return t('sentiment.positive');
    if (score >= 0) return t('sentiment.neutralPositive');
    if (score >= -20) return t('sentiment.neutralNegative');
    return t('sentiment.negative');
  };

  const positivePercent = (currentRecommendation.positive / currentRecommendation.total) * 100;
  const neutralPercent = (currentRecommendation.hold / currentRecommendation.total) * 100;
  const negativePercent = (currentRecommendation.negative / currentRecommendation.total) * 100;

  return (
    <div>
      <div className="mb-5">
        <h3 className="text-lg font-bold text-black serif mb-2">
          {t('title')}
        </h3>
        <p className="text-sm text-gray-600">
          {t('subtitle')}
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-2 border-black bg-white mb-0">
        <div className="flex overflow-x-auto scrollbar-hide">
          {recommendations.map((rec, index) => {
            const translationKey = getPeriodTranslationKey(rec.period);
            const periodLabel = translationKey.startsWith('period.') ? t(translationKey) : rec.period;
            
            return (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`
                  flex-1 min-w-fit px-3 py-2 font-bold text-xs transition-all duration-200 
                  border-r-2 last:border-r-0 border-black uppercase tracking-wide whitespace-nowrap
                  ${activeTab === index 
                    ? 'bg-black text-[#fff1e0]' 
                    : 'bg-white text-black hover:bg-gray-100'
                  }
                `}
              >
                {periodLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Content */}
      <div className={`border-2 border-t-0 border-black p-3 ${getSentimentBg(currentRecommendation.net_score)} transition-colors duration-300`}>
        {/* Header with Score */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="text-xs text-gray-600 uppercase tracking-wide">
              {currentRecommendation.total} {t('label.recommendations')}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold leading-none ${getSentimentColor(currentRecommendation.net_score)}`}>
              {currentRecommendation.net_score.toFixed(1)}
            </div>
            <div className={`text-xs font-bold uppercase ${getSentimentColor(currentRecommendation.net_score)}`}>
              {getSentimentLabel(currentRecommendation.net_score)}
            </div>
          </div>
        </div>

        {/* Visual Bar */}
        <div className="mb-3">
          <div className="h-6 flex border-2 border-black">
            {/* Strong Buy + Buy */}
            <div
              className="bg-green-500 flex items-center justify-center text-white text-xs font-bold transition-all duration-300"
              style={{ width: `${positivePercent}%` }}
              title={`Positivo: ${positivePercent.toFixed(1)}%`}
            >
              {positivePercent > 15 && `${positivePercent.toFixed(0)}%`}
            </div>
            {/* Hold */}
            <div
              className="bg-gray-500 flex items-center justify-center text-white text-xs font-bold transition-all duration-300"
              style={{ width: `${neutralPercent}%` }}
              title={`Neutral: ${neutralPercent.toFixed(1)}%`}
            >
              {neutralPercent > 15 && `${neutralPercent.toFixed(0)}%`}
            </div>
            {/* Sell + Strong Sell */}
            <div
              className="bg-red-500 flex items-center justify-center text-white text-xs font-bold transition-all duration-300"
              style={{ width: `${negativePercent}%` }}
              title={`Negativo: ${negativePercent.toFixed(1)}%`}
            >
              {negativePercent > 15 && `${negativePercent.toFixed(0)}%`}
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-3">
          <div className="bg-white border-2 border-black p-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase tracking-wide font-bold text-gray-600">{t('label.strongBuy')}</span>
              <span className="w-2 h-2 bg-green-600 border border-black"></span>
            </div>
            <div className="text-xl font-bold text-black">
              {currentRecommendation.strongBuy}
            </div>
            <div className="text-xs font-semibold text-green-600">
              {(currentRecommendation.strongBuy / currentRecommendation.total * 100).toFixed(1)}%
            </div>
          </div>

          <div className="bg-white border-2 border-black p-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase tracking-wide font-bold text-gray-600">{t('label.buy')}</span>
              <span className="w-2 h-2 bg-green-400 border border-black"></span>
            </div>
            <div className="text-xl font-bold text-black">
              {currentRecommendation.buy}
            </div>
            <div className="text-xs font-semibold text-green-500">
              {(currentRecommendation.buy / currentRecommendation.total * 100).toFixed(1)}%
            </div>
          </div>

          <div className="bg-white border-2 border-black p-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase tracking-wide font-bold text-gray-600">{t('label.hold')}</span>
              <span className="w-2 h-2 bg-gray-500 border border-black"></span>
            </div>
            <div className="text-xl font-bold text-black">
              {currentRecommendation.hold}
            </div>
            <div className="text-xs font-semibold text-gray-600">
              {(currentRecommendation.hold / currentRecommendation.total * 100).toFixed(1)}%
            </div>
          </div>

          <div className="bg-white border-2 border-black p-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase tracking-wide font-bold text-gray-600">{t('label.sell')}</span>
              <span className="w-2 h-2 bg-orange-400 border border-black"></span>
            </div>
            <div className="text-xl font-bold text-black">
              {currentRecommendation.sell}
            </div>
            <div className="text-xs font-semibold text-orange-500">
              {(currentRecommendation.sell / currentRecommendation.total * 100).toFixed(1)}%
            </div>
          </div>

          <div className="bg-white border-2 border-black p-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase tracking-wide font-bold text-gray-600">{t('label.strongSell')}</span>
              <span className="w-2 h-2 bg-red-600 border border-black"></span>
            </div>
            <div className="text-xl font-bold text-black">
              {currentRecommendation.strongSell}
            </div>
            <div className="text-xs font-semibold text-red-600">
              {(currentRecommendation.strongSell / currentRecommendation.total * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-50 border-2 border-green-600 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wide font-bold text-green-800 mb-1">
              {t('label.positiveRecs')}
            </div>
            <div className="text-lg font-bold text-green-600">
              {currentRecommendation.positive}
            </div>
            <div className="text-xs font-semibold text-green-700">
              {positivePercent.toFixed(1)}%
            </div>
          </div>

          <div className="bg-gray-50 border-2 border-gray-500 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wide font-bold text-gray-800 mb-1">
              {t('label.neutralRecs')}
            </div>
            <div className="text-lg font-bold text-gray-700">
              {currentRecommendation.hold}
            </div>
            <div className="text-xs font-semibold text-gray-600">
              {neutralPercent.toFixed(1)}%
            </div>
          </div>

          <div className="bg-red-50 border-2 border-red-600 p-2 text-center">
            <div className="text-[10px] uppercase tracking-wide font-bold text-red-800 mb-1">
              {t('label.negativeRecs')}
            </div>
            <div className="text-lg font-bold text-red-600">
              {currentRecommendation.negative}
            </div>
            <div className="text-xs font-semibold text-red-700">
              {negativePercent.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Summary Insight */}
      <div className="mt-3 p-3 bg-white border-2 border-black">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-black text-[#fff1e0] flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-black serif text-sm mb-1">
              {t('consensusAnalysis.title')}
            </h4>
            <p className="text-xs text-gray-700 leading-relaxed">
              {t.rich('consensusAnalysis.text', {
                period: (() => {
                  const key = getPeriodTranslationKey(currentRecommendation.period);
                  return (key.startsWith('period.') ? t(key) : currentRecommendation.period).toLowerCase();
                })(),
                positiveCount: currentRecommendation.positive,
                totalCount: currentRecommendation.total,
                positivePercent: positivePercent.toFixed(1),
                sentiment: getSentimentLabel(currentRecommendation.net_score).toLowerCase(),
                netScore: currentRecommendation.net_score.toFixed(1),
                strong: (chunks) => <strong>{chunks}</strong>,
                strongGreen: (chunks) => <strong className="text-green-600">{chunks}</strong>,
                strongBlack: (chunks) => <strong className="text-black">{chunks}</strong>,
                strongSentiment: (chunks) => <strong className={getSentimentColor(currentRecommendation.net_score)}>{chunks}</strong>
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
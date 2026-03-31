'use client';

import { useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import MultiStockChart from '../MultiStockChart';
import StockRecommendations from '../StockRecommendations';

const COLORS = [
  '#000000', '#22c55e', '#ef4444', '#3b82f6', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316',
];

export default function TopHoldings({ isin }) {
  const { getSessionToken } = useAuth();
  const t = useTranslations('topHoldings');
  const { data, loading, error, fetchData } = useApi();

  useEffect(() => {
    if (isin) {
      fetchData(`/api/chat/artifacts/top-holdings/${isin}`, {
        auth: true,
        getSessionToken,
      });
    }
  }, [isin]);

  const chartData = useMemo(() => {
    if (!data?.stocks_data || !Array.isArray(data.stocks_data)) {
      return { stocks: [], colors: [] };
    }

    const stocks = data.stocks_data.map((holding, index) => ({
      ticker: holding.ticker,
      data: holding.stock_price_history || [],
      color: COLORS[index % COLORS.length],
    }));

    return { stocks, colors: COLORS.slice(0, stocks.length) };
  }, [data]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
          <span>{t('message.loading')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-400 text-sm">
        <div className="text-center">
          <div className="mb-2">{t('message.error')}</div>
          <div className="text-xs text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  if (!chartData.stocks || chartData.stocks.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        {t('message.noHoldingsData')}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-black serif mb-2">
          {t('title')}
        </h3>
        <p className="text-sm text-gray-600">
          {t('description')}
        </p>
      </div>

      <MultiStockChart
        stocks={chartData.stocks}
        colors={chartData.colors}
        height={300}
      />

      <StockRecommendations recommendations={data?.stock_recommendations} />
    </div>
  );
}

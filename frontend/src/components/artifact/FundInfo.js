'use client';

import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useApi } from '@/hooks/useApi';
import PriceChart from '../PriceChart';
import { useTranslations } from 'next-intl';

export default function FundInfo({ isin }) {
  const { getSessionToken } = useAuth();
  const t = useTranslations('chatContent');
  const { data: fundInfo, loading, error, fetchData } = useApi();

  useEffect(() => {
    if (isin) {
      fetchData(`/api/chat/artifacts/fund-info/${isin}`, {
        auth: true,
        getSessionToken,
      });
    }
  }, [isin]);

  if (loading || !fundInfo) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
          <span>Cargando información del fondo...</span>
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
            <h3 className="text-lg font-bold text-red-800 serif">{t('message.error')}</h3>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2">
        <PriceChart
            priceData={fundInfo.price_history}
            isPositive={fundInfo.fund_info.ytd_return >= 0}
            chatArtifact={true}
            mainFundPage={true}
        />
    </div>
  );
}

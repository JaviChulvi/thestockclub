'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Link as IntlLink } from '@/i18n/navigation';
import FundCard from '@/components/FundCard';

import { API_BASE_URL } from '@/config/api';

export default function ManagerFundsPage({ initialData }) {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const t = useTranslations('manager');

  const hasInitialData = initialData?.manager != null;
  const [managerData, setManagerData] = useState(() => hasInitialData ? initialData.manager : null);
  const [funds, setFunds] = useState(() => hasInitialData ? (initialData.funds || []) : []);
  const [loading, setLoading] = useState(!hasInitialData);
  const [error, setError] = useState(null);
  const hasLoaded = useRef(hasInitialData);

  const fetchManagerData = useCallback(async () => {
    try {
      if (hasLoaded.current) return;
      hasLoaded.current = true;

      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/funds/manager/${id}/20`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setManagerData(data.manager);
      setFunds(data.funds || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching manager data:', err);
      setError(t('message.error'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    if (id && !hasInitialData) {
      hasLoaded.current = false;
      fetchManagerData();
    }
  }, [id, fetchManagerData, hasInitialData]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  if (error || !managerData) {
    return (
      <div className="bg-[#fff1e0] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border-l-4 border-red-600 p-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">{t('message.error')}</h3>
            <p className="text-red-700">{error || t('message.errorDesc')}</p>
            <IntlLink
              href="/fondos"
              className="mt-4 inline-block bg-black text-[#fff1e0] px-4 py-2 font-bold text-sm uppercase tracking-wide hover:bg-gray-800"
            >
              {t('navigation.backToFunds')}
            </IntlLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fff1e0] min-h-screen">
      {/* Breaking News Banner */}
      <div className="bg-red-600 text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <span className="font-bold text-sm uppercase mr-4">{t('banner.title')}</span>
            <span className="text-sm">{t('banner.subtitle', { name: managerData.name, count: funds.length })}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Manager Header */}
        <div className="border-b-4 border-black pb-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-black leading-tight serif mb-4">
                {managerData.name}
              </h1>
              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium">{t('header.label')}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-6xl font-bold text-black serif mb-2">
                {funds.length}
              </div>
              <div className="text-sm text-gray-600 uppercase tracking-wide">
                {t('header.managedFunds')}
              </div>
            </div>
          </div>
        </div>

        {/* Funds Grid */}
        {funds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {funds.map((fund) => (
              <FundCard
                key={fund.isin}
                fund={fund}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border-2 border-black p-8 text-center">
            <h3 className="text-xl font-bold text-black serif mb-4">
              {t('message.noFunds')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('message.noFundsDesc')}
            </p>
            <IntlLink
              href="/fondos"
              className="inline-block bg-black text-[#fff1e0] px-6 py-3 font-bold text-sm uppercase tracking-wide hover:bg-gray-800"
            >
              {t('navigation.viewAll')}
            </IntlLink>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 border-t-4 border-black pt-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <IntlLink
              href="/fondos"
              className="bg-gray-200 text-black px-6 py-3 font-bold text-sm transition-colors duration-200 hover:bg-gray-300 uppercase tracking-wide text-center"
            >
              {t('navigation.backToFunds')}
            </IntlLink>
            <IntlLink
              href="/chat"
              className="bg-black text-[#fff1e0] px-6 py-3 font-bold text-sm transition-colors duration-200 hover:bg-gray-800 uppercase tracking-wide text-center"
            >
              {t('navigation.consulting')}
            </IntlLink>
          </div>
        </div>
      </div>
    </div>
  );
}


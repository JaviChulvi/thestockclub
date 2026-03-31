'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import FundSearch from '@/components/FundSearch';
import ComparisonChart from '@/components/ComparisonChart';

// API Configuration
import { API_BASE_URL } from '@/config/api';

// API Functions
async function fetchFundsWithHistory(limit = 50) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/funds/with-history?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.funds) {
      return data.funds;
    } else {
      throw new Error(data.error || 'Failed to fetch funds');
    }
  } catch (error) {
    console.error('Error fetching funds from API:', error);
    return [];
  }
}

async function fetchFundByIsin(isin) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/funds/${isin}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching fund ${isin} from API:`, error);
    return null;
  }
}

// Real fund data will be loaded from API

export default function ComparePage() {
  const t = useTranslations('compare');
  const [selectedFunds, setSelectedFunds] = useState([]);
  const [initialInvestment, setInitialInvestment] = useState(10000);
  const [availableFunds, setAvailableFunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasLoaded = useRef(false);

  // Load funds from API on component mount
  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    async function loadFunds() {
      try {
        setLoading(true);
        setError(null);
        const funds = await fetchFundsWithHistory(50);
        
        // Transform API data to match our component structure
        const transformedFunds = funds.map(fund => ({
          fund: {
            id: fund.id,
            isin: fund.isin,
            long_name: fund.name,
            short_name: fund.shortName,
            currency: fund.currency,
            previous_close: fund.price.toString(),
            region: fund.region,
            fund_type: fund.type
          },
          price_history: fund.last_90d_price_history || []
        }));
        
        setAvailableFunds(transformedFunds);
      } catch (err) {
        console.error('Failed to load funds:', err);
        setError('Failed to load funds data');
      } finally {
        setLoading(false);
      }
    }

    loadFunds();
  }, []);

  // Calculate investment returns for each fund
  const fundPerformanceData = useMemo(() => {
    return selectedFunds.map(fund => {
      const priceHistory = fund.price_history;
      if (!priceHistory || priceHistory.length === 0) return null;

      // Get initial and final prices
      const initialPrice = parseFloat(priceHistory[0].close_price);
      const currentPrice = parseFloat(priceHistory[priceHistory.length - 1].close_price);
      
      // Calculate number of shares that could be bought with initial investment
      const shares = initialInvestment / initialPrice;
      
      // Calculate current value and return
      const currentValue = shares * currentPrice;
      const totalReturn = currentValue - initialInvestment;
      const returnPercentage = ((currentValue - initialInvestment) / initialInvestment) * 100;

      // Transform price history to show investment value over time
      const investmentHistory = priceHistory.map(point => ({
        date: point.date,
        value: shares * parseFloat(point.close_price)
      }));

      return {
        fund: fund.fund,
        shares,
        currentValue,
        totalReturn,
        returnPercentage,
        investmentHistory
      };
    }).filter(Boolean);
  }, [selectedFunds, initialInvestment]);

  const handleAddFund = async (fund) => {
    if (selectedFunds.length >= 5) {
      alert(t('message.maxFundsAlert'));
      return;
    }
    
    if (selectedFunds.find(f => f.fund.isin === fund.fund.isin)) {
      alert(t('message.fundAlreadyExists'));
      return;
    }

    try {
      // Fetch full price history for the selected fund
      const fullFundData = await fetchFundByIsin(fund.fund.isin);
      
      if (fullFundData && fullFundData.price_history) {
        const enhancedFund = {
          ...fund,
          price_history: fullFundData.price_history
        };
        setSelectedFunds([...selectedFunds, enhancedFund]);
      } else {
        // Fallback to 90-day history from the fund search
        setSelectedFunds([...selectedFunds, fund]);
      }
    } catch (error) {
      console.error('Error fetching full fund data:', error);
      // Fallback to 90-day history from the fund search
      setSelectedFunds([...selectedFunds, fund]);
    }
  };

  const handleRemoveFund = (isin) => {
    setSelectedFunds(selectedFunds.filter(fund => fund.fund.isin !== isin));
  };

  return (
    <div className="bg-[#fff1e0] min-h-screen">
      {/* Breaking News Banner */}
      <div className="bg-[#315b97] text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <span className="font-bold text-sm uppercase mr-4">{t('banner.title')}</span>
            <span className="text-sm">{t('banner.subtitle')}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-black leading-tight serif mb-4">
            {t('title')}
          </h1>
          <h2 className="text-xl md:text-2xl font-light text-gray-800 leading-relaxed mb-4">
            {t('subtitle')}
          </h2>
        </div>

        {/* Investment Amount Input */}
        <div className="bg-white border-2 border-black p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="mb-4 sm:mb-0">
              <h3 className="text-lg font-bold text-black serif mb-2">{t('section.investmentCapital')}</h3>
              <p className="text-gray-600 text-sm">{t('section.investmentCapitalDesc')}</p>
            </div>
            <div className="flex items-center space-x-3">
              <label className="text-sm font-bold text-black uppercase tracking-wide">€</label>
              <input
                type="number"
                value={initialInvestment}
                onChange={(e) => setInitialInvestment(parseFloat(e.target.value) || 10000)}
                className="w-32 px-3 py-2 border-2 border-gray-300 bg-[#fff1e0] text-black font-bold focus:outline-none focus:border-black transition-colors duration-200"
                min="100"
                step="100"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white border-2 border-black p-8 mb-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">{t('message.loading')}</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white border-2 border-red-600 p-6 mb-8">
            <div className="flex items-center">
              <div className="text-red-600 font-bold mr-3">⚠️</div>
              <div>
                <h3 className="text-lg font-bold text-red-800 serif">{t('message.error')}</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Fund Search */}
        {!loading && !error && (
          <div className="mb-8">
            <FundSearch
              availableFunds={availableFunds}
              onAddFund={handleAddFund}
              onRemoveFund={handleRemoveFund}
              selectedFunds={selectedFunds}
            />
          </div>
        )}

        {/* Comparison Results */}
        {selectedFunds.length > 0 && (
          <>
            {/* Investment Performance Chart */}
            <div className="mb-8 bg-white border-2 border-black">
              <div className="p-6 border-b-2 border-black bg-gray-100">
                <h2 className="text-2xl font-bold text-black serif mb-2">
                  {t('section.portfolioEvolution')}
                </h2>
                <p className="text-gray-700 font-medium">
                  {t('section.historicalSimulation', {amount: initialInvestment.toLocaleString()})}
                </p>
              </div>
              <div className="p-6" style={{ height: '500px' }}>
                <ComparisonChart 
                  fundPerformanceData={fundPerformanceData}
                  initialInvestment={initialInvestment}
                />
              </div>
            </div>

            {/* Performance Summary Table */}
            <div className="bg-white border-2 border-black overflow-hidden">
              <div className="p-6 border-b-2 border-black bg-gray-100">
                <h2 className="text-2xl font-bold text-black serif mb-2">
                  {t('section.comparisonAnalysis')}
                </h2>
                <p className="text-gray-700 font-medium">
                  {t('section.comparisonAnalysisDesc')}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-black text-[#fff1e0]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                        {t('table.header.fund')}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                        {t('table.header.initialCapital')}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                        {t('table.header.currentValue')}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                        {t('table.header.result')}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                        {t('table.header.performance')}
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">
                        {t('table.header.management')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white border-t-2 border-black">
                    {fundPerformanceData.map((performance) => {
                      const isPositive = performance.totalReturn >= 0;
                      return (
                        <tr key={performance.fund.isin} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-bold text-black">
                                {performance.fund.short_name}
                              </div>
                              <div className="text-xs text-gray-600 font-mono uppercase tracking-wide">
                                {performance.fund.isin}
                              </div>
                              {performance.fund.fund_type && (
                                <div className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-800 mt-1">
                                  {performance.fund.fund_type}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black">
                            {initialInvestment.toLocaleString()}€
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-black">
                            {performance.currentValue.toLocaleString('es-ES', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}€
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                              {isPositive ? '+' : ''}{performance.totalReturn.toLocaleString('es-ES', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}€
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                              {isPositive ? '+' : ''}{performance.returnPercentage.toFixed(2)}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleRemoveFund(performance.fund.isin)}
                              className="bg-red-600 text-white px-3 py-1 font-bold text-xs uppercase tracking-wide hover:bg-red-700 transition-colors duration-200"
                            >
                              {t('button.remove')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {selectedFunds.length === 0 && (
          <div className="bg-white border-2 border-black p-12 text-center">
            <div className="text-2xl font-bold text-black serif mb-4">
              {t('section.startAnalysis')}
            </div>
            <div className="text-gray-700 font-medium mb-6">
              {t('section.startAnalysisDesc')}
            </div>
            <div className="bg-gray-100 border-l-4 border-black p-4 text-left max-w-md mx-auto">
              <h4 className="font-bold text-black mb-2 text-sm uppercase tracking-wide">{t('label.instructions')}</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• {t('instructions.step1')}</li>
                <li>• {t('instructions.step2')}</li>
                <li>• {t('instructions.step3')}</li>
                <li>• {t('instructions.step4')}</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

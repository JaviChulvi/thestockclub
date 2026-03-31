'use client';

import { useState, useMemo } from 'react';
import {useTranslations} from 'next-intl';

export default function FundSearch({ availableFunds, onAddFund, onRemoveFund, selectedFunds }) {
  const t = useTranslations('fundSearch');
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Filter funds based on search term
  const filteredFunds = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    return availableFunds.filter(fund => {
      const isAlreadySelected = selectedFunds.some(selected => selected.fund.isin === fund.fund.isin);
      if (isAlreadySelected) return false;

      return (
        fund.fund.isin.toLowerCase().includes(term) ||
        fund.fund.long_name.toLowerCase().includes(term) ||
        fund.fund.short_name.toLowerCase().includes(term)
      );
    });
  }, [searchTerm, availableFunds, selectedFunds]);

  const handleSelectFund = (fund) => {
    onAddFund(fund);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const handleInputFocus = () => {
    if (searchTerm.trim()) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Delay closing to allow for click events on dropdown items
    setTimeout(() => setIsOpen(false), 200);
  };

  return (
    <div className="relative">
      <div className="bg-white border-2 border-black p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-black serif mb-2">{t('title')}</h3>
          <p className="text-gray-600 text-sm">{t('subtitle')}</p>
        </div>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={t('placeholder.search')}
            className="block w-full px-4 py-3 border-2 border-gray-300 bg-[#fff1e0] text-black font-medium focus:outline-none focus:border-black transition-colors duration-200 text-lg"
            disabled={selectedFunds.length >= 5}
          />
          
          {/* Search Results Dropdown */}
          {isOpen && searchTerm.trim() && (
            <div className="absolute z-10 mt-1 w-full bg-white border-2 border-black shadow-lg max-h-60 overflow-auto">
              {filteredFunds.length > 0 ? (
                filteredFunds.map((fund) => (
                  <div
                    key={fund.fund.isin}
                    onClick={() => handleSelectFund(fund)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-black">
                          {fund.fund.long_name}
                        </div>
                        <div className="text-sm text-gray-500 mt-1 flex items-center space-x-3">
                          <span>{t('label.isin')}: {fund.fund.isin}</span>
                          <span>•</span>
                          <span>{fund.fund.currency}</span>
                          <span>•</span>
                          <span>{fund.fund.region}</span>
                          {fund.fund.fund_type && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {fund.fund.fund_type}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-1 flex items-center space-x-4">
                          <span>
                            {t('label.currentPrice')}: {parseFloat(fund.fund.previous_close).toFixed(2)} {fund.fund.currency}
                          </span>
                          {fund.price_history && fund.price_history.length > 1 && (
                            <span>
                              {(() => {
                                const firstPrice = parseFloat(fund.price_history[0].close_price);
                                const lastPrice = parseFloat(fund.price_history[fund.price_history.length - 1].close_price);
                                const change = ((lastPrice - firstPrice) / firstPrice) * 100;
                                const isPositive = change >= 0;
                                return (
                                  <span className={`${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                    {isPositive ? '+' : ''}{change.toFixed(1)}% ({t('label.fullPeriod')})
                                  </span>
                                );
                              })()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <button className="bg-black text-[#fff1e0] px-3 py-1 font-bold text-xs uppercase tracking-wide hover:bg-gray-800 transition-colors duration-200">
                          {t('button.add')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  {t('message.noResults', {term: searchTerm})}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-4 p-3 bg-gray-100 border-l-4 border-black">
          {selectedFunds.length >= 5 ? (
            <div className="text-red-700 font-bold text-sm">
              {t('message.limitReached')}
            </div>
          ) : (
            <div className="text-gray-700 text-sm">
              <span className="font-bold">{t('label.instructions')}</span> {t('message.instructionsText')}
              <span className="font-bold ml-2">{t('label.selected')}: {selectedFunds.length}/5</span>
            </div>
          )}
        </div>

        {/* Selected Funds Preview */}
        {selectedFunds.length > 0 && (
          <div className="mt-6 pt-4 border-t-2 border-black">
            <h4 className="text-sm font-bold text-black mb-3 uppercase tracking-wide">
                {t('label.selectedFundsForAnalysis')}
            </h4>
            <div className="space-y-2">
              {selectedFunds.map((fund) => (
                <div 
                  key={fund.fund.isin}
                  className="flex items-center justify-between bg-gray-100 px-3 py-2 border border-gray-300"
                >
                  <div>
                    <span className="text-sm font-bold text-black">
                      {fund.fund.short_name}
                    </span>
                    <span className="ml-2 text-xs text-gray-600 font-mono">
                      ({fund.fund.isin})
                    </span>
                    {fund.fund.fund_type && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-black text-[#fff1e0]">
                        {fund.fund.fund_type}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveFund(fund.fund.isin)}
                    className="text-xs text-red-600 hover:text-red-800 font-bold"
                  >
                    ✕ {t('button.remove')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

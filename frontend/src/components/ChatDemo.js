'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// CHART PATH GENERATOR
// ============================================================================

function generateChartPath(points, width, height, padding = 6) {
  const xStep = (width - padding * 2) / (points.length - 1);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((p, i) => ({
    x: padding + i * xStep,
    y: padding + (1 - (p - min) / range) * (height - padding * 2),
  }));

  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
    d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const areaD = d + ` L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;
  return { linePath: d, areaPath: areaD, coords };
}

// Pre-generated realistic price data
const chartDataSets = {
  appleUp: [178, 181, 179, 185, 188, 186, 192, 195, 193, 198, 201, 199, 205, 208, 212, 210, 215, 218, 220, 224],
  msftUp: [380, 385, 382, 390, 395, 392, 398, 402, 400, 408, 412, 415, 410, 418, 422, 425, 420, 428, 432, 435],
  fundSteady: [112, 113, 112.5, 114, 113.8, 115, 114.5, 116, 115.8, 117, 116.5, 118, 117.5, 119, 118.8, 120, 119.5, 121, 120.8, 122],
  holdingsMix1: [100, 102, 104, 103, 106, 108, 107, 110, 112, 115, 113, 116, 118, 120, 119, 122, 124, 126, 125, 128],
  holdingsMix2: [100, 99, 101, 103, 102, 105, 104, 107, 109, 108, 111, 113, 112, 115, 114, 117, 119, 118, 121, 120],
  holdingsMix3: [100, 103, 101, 105, 108, 106, 110, 109, 113, 115, 112, 116, 119, 117, 121, 123, 120, 125, 127, 130],
};

// ============================================================================
// CHART COMPONENTS
// ============================================================================

function AreaChart({ data, color = '#000', gradientId, width = 320, height = 80 }) {
  const { linePath, areaPath } = useMemo(
    () => generateChartPath(data, width, height),
    [data, width, height]
  );
  const gId = gradientId || `grad-${color.replace('#', '')}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full block"
      style={{ height }}
    >
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SparkLine({ data, color = '#16a34a', width = 72, height = 28 }) {
  const { linePath } = useMemo(
    () => generateChartPath(data, width, height, 2),
    [data, width, height]
  );

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block" style={{ width, height }}>
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function MultiLineChart({ datasets, colors, width = 320, height = 100, labels }) {
  const paths = useMemo(
    () => datasets.map((data) => generateChartPath(data, width, height, 10)),
    [datasets, width, height]
  );

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full block"
        style={{ height }}
      >
        {paths.map((p, i) => (
          <path key={i} d={p.linePath} fill="none" stroke={colors[i]} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
      {labels && (
        <div className="flex gap-4 mt-2 flex-wrap">
          {labels.map((label, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-4 h-[3px] rounded-full" style={{ backgroundColor: colors[i] }} />
              <span className="text-[11px] text-gray-600 font-medium">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricsRow({ items }) {
  return (
    <div className="grid grid-cols-3 gap-2 mt-3">
      {items.map((item, i) => (
        <div key={i} className="bg-white border border-gray-200 py-2 px-3 text-center">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{item.label}</div>
          <div className={`text-sm font-bold serif ${item.color || 'text-black'}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// SCENARIO DEFINITIONS
// ============================================================================

function buildScenarios(t) {
  return [
    {
      id: 'stock-analysis',
      userMessage: t('scenario1User'),
      response: {
        text: t('scenario1Response'),
        chart: () => (
          <div className="mt-3 border-2 border-black bg-white">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{t('scenario1ChartTitle')}</span>
              <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 border border-green-200">+12.4%</span>
            </div>
            <div className="px-3 pt-3 pb-1">
              <AreaChart data={chartDataSets.appleUp} color="#16a34a" gradientId="apple-grad" height={90} />
            </div>
            <div className="grid grid-cols-3 border-t border-gray-200">
              {[
                { label: 'P/E Ratio', value: '28.5' },
                { label: 'Beta', value: '1.24' },
                { label: 'Div. Yield', value: '0.55%' },
              ].map((m, i) => (
                <div key={i} className={`py-2 px-3 text-center ${i < 2 ? 'border-r border-gray-200' : ''}`}>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">{m.label}</div>
                  <div className="text-sm font-bold serif text-black">{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
    },
    {
      id: 'fund-holdings',
      userMessage: t('scenario2User'),
      response: {
        text: t('scenario2Response'),
        chart: () => (
          <div className="mt-3 border-2 border-black bg-white">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{t('scenario2ChartTitle')}</span>
            </div>
            <div className="px-3 pt-3 pb-2">
              <MultiLineChart
                datasets={[chartDataSets.holdingsMix1, chartDataSets.holdingsMix2, chartDataSets.holdingsMix3]}
                colors={['#000000', '#6366f1', '#f59e0b']}
                labels={['TSMC', 'MSFT', 'AAPL']}
                height={90}
              />
            </div>
            <div className="border-t border-gray-200">
              {[
                { name: 'Taiwan Semiconductor', pct: '8.45%', change: '+14.2%' },
                { name: 'Microsoft Corp', pct: '6.40%', change: '+10.1%' },
                { name: 'Apple Inc', pct: '5.42%', change: '+15.8%' },
              ].map((h, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-2 ${i < 2 ? 'border-b border-gray-100' : ''}`}>
                  <span className="text-xs text-gray-700 font-medium">{h.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-green-700 font-medium">{h.change}</span>
                    <span className="text-xs font-bold text-black w-12 text-right">{h.pct}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
    },
    {
      id: 'best-funds',
      userMessage: t('scenario3User'),
      response: {
        text: t('scenario3Response'),
        chart: () => (
          <div className="mt-3 space-y-2">
            {[
              { name: 'MS INVF US Growth', isin: 'LU0073232471', ret: '+18.42%', data: chartDataSets.holdingsMix3 },
              { name: 'Fidelity Global Tech', isin: 'LU1046421795', ret: '+15.87%', data: chartDataSets.holdingsMix1 },
              { name: 'Amundi MSCI World', isin: 'LU1482751903', ret: '+12.35%', data: chartDataSets.fundSteady },
            ].map((fund, i) => (
              <div key={i} className="border-2 border-black bg-white flex items-center gap-3 pr-3">
                <div className="bg-black text-[#fff1e0] w-9 self-stretch flex items-center justify-center text-base font-bold serif flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0 py-2">
                  <div className="text-xs font-bold text-black truncate">{fund.name}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{fund.isin}</div>
                </div>
                <div className="flex-shrink-0">
                  <SparkLine data={fund.data} color="#16a34a" />
                </div>
                <div className="text-sm font-bold text-green-700 w-16 text-right flex-shrink-0">{fund.ret}</div>
              </div>
            ))}
          </div>
        ),
      },
    },
    {
      id: 'fund-info',
      userMessage: t('scenario4User'),
      response: {
        text: t('scenario4Response'),
        chart: () => (
          <div className="mt-3 border-2 border-black bg-white">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{t('scenario4ChartTitle')}</span>
              <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 border border-green-200">+22.1% YTD</span>
            </div>
            <div className="px-3 pt-3 pb-1">
              <AreaChart data={chartDataSets.msftUp} color="#000" gradientId="fund-grad" height={90} />
            </div>
            <div className="grid grid-cols-3 border-t border-gray-200">
              {[
                { label: t('scenario4PriceLabel'), value: '€435.20' },
                { label: 'TER', value: '0.18%' },
                { label: t('scenario4VolatilityLabel'), value: '14.2%' },
              ].map((m, i) => (
                <div key={i} className={`py-2 px-3 text-center ${i < 2 ? 'border-r border-gray-200' : ''}`}>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">{m.label}</div>
                  <div className="text-sm font-bold serif text-black">{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
    },
    {
      id: 'stock-screener',
      userMessage: t('scenario5User'),
      response: {
        text: t('scenario5Response'),
        chart: () => (
          <div className="mt-3 border-2 border-black bg-white">
            <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{t('scenario5ChartTitle')}</span>
              <span className="text-[10px] text-gray-400">{t('scenario5Count')}</span>
            </div>
            {[
              { ticker: 'ENB', name: 'Enbridge Inc', price: '54.32 CAD', mcap: '108.2B', ret: '+8.2%', positive: true, data: chartDataSets.fundSteady },
              { ticker: 'CNQ', name: 'Canadian Natural Res.', price: '38.15 CAD', mcap: '79.5B', ret: '+12.4%', positive: true, data: chartDataSets.holdingsMix1 },
              { ticker: 'SU', name: 'Suncor Energy', price: '52.80 CAD', mcap: '65.1B', ret: '-3.1%', positive: false, data: chartDataSets.holdingsMix2 },
            ].map((stock, i) => (
              <div key={i} className={`flex items-center gap-3 px-3 py-2.5 ${i < 2 ? 'border-b border-gray-100' : ''}`}>
                <div className="bg-black text-[#fff1e0] px-2 py-1 text-[10px] font-bold tracking-wider min-w-[42px] text-center flex-shrink-0">{stock.ticker}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-black truncate">{stock.name}</div>
                  <div className="text-[10px] text-gray-400">{stock.price} · Cap: {stock.mcap}</div>
                </div>
                <div className="flex-shrink-0">
                  <SparkLine data={stock.data} color={stock.positive ? '#16a34a' : '#dc2626'} width={56} height={22} />
                </div>
                <div className={`text-xs font-bold w-12 text-right flex-shrink-0 ${stock.positive ? 'text-green-700' : 'text-red-600'}`}>{stock.ret}</div>
              </div>
            ))}
          </div>
        ),
      },
    },
  ];
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.1 },
  },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.05, staggerDirection: -1, duration: 0.15 },
  },
};

const messageVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

const chartVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.25 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

// ============================================================================
// CHAT DEMO COMPONENT
// ============================================================================

export default function ChatDemo({ cycleDuration = 6000 }) {
  const t = useTranslations('chatDemo');
  const scenarios = useMemo(() => buildScenarios(t), [t]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scenario = useMemo(() => scenarios[currentIndex], [scenarios, currentIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % scenarios.length);
    }, cycleDuration);
    return () => clearInterval(interval);
  }, [cycleDuration]);

  const handleDotClick = useCallback((i) => setCurrentIndex(i), []);

  const renderText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="relative">
      {/* Main chat window */}
      <div className="border-4 border-black bg-white">
        {/* Header bar */}
        <div className="px-4 py-3 border-b-2 border-black bg-black text-[#fff1e0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="text-sm font-bold uppercase tracking-wide serif">The Stock Club AI</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-[10px] uppercase tracking-wider opacity-75">{t('online')}</span>
          </div>
        </div>

        {/* Messages area */}
        <div className="p-4 sm:p-5 min-h-[360px] sm:min-h-[400px] overflow-hidden bg-[#fff1e0]">
          <AnimatePresence mode="wait">
            <motion.div
              key={scenario.id}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="space-y-3"
            >
              {/* User message */}
              <motion.div variants={messageVariants} className="flex justify-end">
                <div className="bg-white border-2 border-gray-300 px-4 py-2.5 shadow-sm max-w-[85%]">
                  <p className="text-sm text-black leading-relaxed">{scenario.userMessage}</p>
                </div>
              </motion.div>

              {/* AI text response */}
              <motion.div variants={messageVariants}>
                <p className="text-sm text-black leading-relaxed">
                  {renderText(scenario.response.text)}
                </p>
              </motion.div>

              {/* Chart / artifact */}
              {scenario.response.chart && (
                <motion.div variants={chartVariants}>
                  {scenario.response.chart()}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Input bar */}
        <div className="px-4 py-3 border-t-2 border-black bg-white">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border-2 border-gray-200 px-3 py-2 flex items-center">
              <span className="text-sm text-gray-400">{t('inputPlaceholder')}</span>
            </div>
            <div className="bg-black p-2.5">
              <svg className="w-4 h-4 text-[#fff1e0]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {scenarios.map((_, i) => (
          <button
            key={i}
            onClick={() => handleDotClick(i)}
            className={`h-2 transition-all duration-300 ${
              i === currentIndex ? 'bg-black w-6' : 'bg-gray-300 hover:bg-gray-500 w-2'
            }`}
            aria-label={`Scenario ${i + 1}`}
          />
        ))}
      </div>

    </div>
  );
}

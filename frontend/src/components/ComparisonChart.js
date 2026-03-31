'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  XYChart,
  AnimatedLineSeries,
  AnimatedAxis,
  Tooltip,
  buildChartTheme,
} from '@visx/xychart';
import { useParentSize } from '@visx/responsive';

// Colors for up to 5 funds
const FUND_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red  
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
];

function ResponsiveComparisonChart({ fundPerformanceData, initialInvestment }) {
  const { parentRef, width, height } = useParentSize();
  const t = useTranslations('comparisonChart');
  
  const chartWidth = Math.max(width || 800, 800);
  const chartHeight = Math.max(height || 400, 400);

  // Transform data for chart
  const { chartData, colorScale } = useMemo(() => {
    if (!fundPerformanceData || fundPerformanceData.length === 0) {
      return { chartData: [], colorScale: {} };
    }

    // Create a combined dataset with all funds
    const allDates = new Set();
    fundPerformanceData.forEach(fund => {
      fund.investmentHistory.forEach(point => {
        // Parse DD/MM/YYYY format correctly to create comparable date strings
        const dateParts = point.date.split('/');
        if (dateParts.length === 3) {
          const day = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1; // Month is 0-based in JS
          const year = parseInt(dateParts[2]);
          const parsedDate = new Date(year, month, day);
          allDates.add(parsedDate.getTime()); // Store as timestamp for proper sorting
        }
      });
    });

    // Sort dates by timestamp
    const sortedDates = Array.from(allDates).sort((a, b) => a - b).map(timestamp => new Date(timestamp));

    // Create chart data structure - include all dates with available data
    const chartData = sortedDates
      .map(date => {
        const dataPoint = { date };

        fundPerformanceData.forEach((fund, index) => {
          // Create target date string in DD/MM/YYYY format for comparison
          const targetDateStr = String(date.getDate()).padStart(2, '0') + '/' +
                               String(date.getMonth() + 1).padStart(2, '0') + '/' +
                               date.getFullYear();

          const historyPoint = fund.investmentHistory.find(h => {
            return h.date === targetDateStr;
          });
          dataPoint[fund.fund.isin] = historyPoint ? historyPoint.value : null;
        });

        return dataPoint;
      })
      .filter(point => {
        // Only include points where at least one fund has data
        return fundPerformanceData.some(fund => point[fund.fund.isin] !== null);
      });

    // Create color scale mapping
    const colorScale = {};
    fundPerformanceData.forEach((fund, index) => {
      colorScale[fund.fund.isin] = FUND_COLORS[index % FUND_COLORS.length];
    });

    return { chartData, colorScale };
  }, [fundPerformanceData]);

  // Data accessors
  const accessors = {
    xAccessor: (d) => d.date,
    yAccessor: (fundIsin) => (d) => d[fundIsin],
  };

  // Simplified Y-scale configuration
  const yScaleConfig = useMemo(() => {
    return { 
      type: 'linear', 
      nice: true, 
      zero: false 
    };
  }, []);

  // Create theme
  const theme = useMemo(() => {
    return buildChartTheme({
      backgroundColor: 'transparent',
      colors: Object.values(colorScale),
      gridColor: '#f3f4f6',
      gridColorDark: '#e5e7eb',
      tickLength: 4,
      svgLabelSmall: {
        fill: '#374151',
        fontSize: 12,
        fontWeight: 'bold',
      },
      svgLabelBig: {
        fill: '#111827',
        fontSize: 14,
        fontWeight: 'bold',
      },
    });
  }, [colorScale]);

  // Format tooltip content
  const renderTooltip = ({ tooltipData }) => {
    if (!tooltipData?.nearestDatum?.datum) return null;
    
    const datum = tooltipData.nearestDatum.datum;
    const date = accessors.xAccessor(datum);
    
    return (
      <div className="bg-white p-3 border-2 border-black shadow-lg text-sm min-w-48">
        <div className="font-bold text-black mb-2 serif">
          {date.toLocaleDateString('es-ES')}
        </div>
        <div className="space-y-1">
          {fundPerformanceData.map((fund) => {
            const value = datum[fund.fund.isin];
            if (value === null || value === undefined) return null;
            
            const gain = value - initialInvestment;
            const gainPercent = ((value - initialInvestment) / initialInvestment) * 100;
            
            return (
              <div key={fund.fund.isin} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: colorScale[fund.fund.isin] }}
                  />
                  <span className="text-black font-medium truncate max-w-32">
                    {fund.fund.short_name}
                  </span>
                </div>
                <div className="text-right ml-2">
                  <div className="font-bold text-black">
                    {value.toLocaleString('es-ES', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}€
                  </div>
                  <div className={`text-xs ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {gain >= 0 ? '+' : ''}{gainPercent.toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Simplified date formatting
  const formatDateTick = (date) => {
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short' 
    });
  };

  const formatValueTick = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M€`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k€`;
    }
    return `${value.toFixed(0)}€`;
  };

  if (!width || width === 0) {
    return <div ref={parentRef} className="w-full h-full" />;
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div ref={parentRef} className="w-full h-full flex items-center justify-center text-gray-500">
        {t('noData')}
      </div>
    );
  }

  return (
    <div ref={parentRef} className="w-full h-full flex flex-col">
      {/* Chart Area */}
      <div className="flex-1 min-h-0">
        <XYChart
          theme={theme}
          xScale={{ type: 'time', nice: false, zero: false }}
          yScale={yScaleConfig}
          width={chartWidth}
          height={chartHeight - 80} // Reserve space for legend
          margin={{ top: 20, right: 20, bottom: 60, left: 80 }}
        >
          {/* Axes */}
          <AnimatedAxis
            orientation="bottom"
            tickFormat={formatDateTick}
            numTicks={Math.min(8, Math.floor(chartWidth / 100))}
          />
          <AnimatedAxis
            orientation="left"
            tickFormat={formatValueTick}
            numTicks={6}
          />

          {/* Horizontal reference line for initial investment */}
          <AnimatedLineSeries
            key="reference-line"
            dataKey="reference"
            data={chartData}
            xAccessor={accessors.xAccessor}
            yAccessor={() => initialInvestment}
            strokeWidth={1}
            stroke="#6B7280"
            strokeDasharray="4,4"
          />

          {/* Line series for each fund */}
          {fundPerformanceData.map((fund, index) => (
            <AnimatedLineSeries
              key={fund.fund.isin}
              dataKey={fund.fund.isin}
              data={chartData}
              xAccessor={accessors.xAccessor}
              yAccessor={accessors.yAccessor(fund.fund.isin)}
              strokeWidth={2}
              stroke={colorScale[fund.fund.isin]}
            />
          ))}

          {/* Tooltip */}
          <Tooltip
            snapTooltipToDatumX
            snapTooltipToDatumY
            showVerticalCrosshair
            showSeriesGlyphs={false}
            renderTooltip={renderTooltip}
          />
        </XYChart>
      </div>

      {/* Legend - Newspaper style - Integrated with chart */}
      <div className="flex-shrink-0 p-4 bg-gray-100 border-t-2 border-black">
        <h4 className="text-sm font-bold text-black uppercase tracking-wide mb-3">{t('legend.title')}</h4>
        <div className="flex flex-wrap gap-4 justify-center">
          {fundPerformanceData.map((fund) => (
            <div key={fund.fund.isin} className="flex items-center bg-white px-2 py-1 border border-gray-300">
              <div
                className="w-4 h-4 mr-2 border border-gray-400"
                style={{ backgroundColor: colorScale[fund.fund.isin] }}
              />
              <span className="text-sm font-bold text-black">
                {fund.fund.short_name}
              </span>
            </div>
          ))}
          <div className="flex items-center bg-white px-2 py-1 border border-gray-300">
            <div className="w-4 h-0 border-t-2 border-dashed border-gray-600 mr-2" />
            <span className="text-sm font-bold text-black">
              {t('legend.initialCapital')} {initialInvestment.toLocaleString()}€
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComparisonChart({ fundPerformanceData, initialInvestment }) {
  return (
    <div className="w-full h-full">
      <ResponsiveComparisonChart 
        fundPerformanceData={fundPerformanceData}
        initialInvestment={initialInvestment}
      />
    </div>
  );
}

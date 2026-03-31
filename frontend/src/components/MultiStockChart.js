'use client';

import { useMemo, useRef } from 'react';
import {
  XYChart,
  AnimatedLineSeries,
  AnimatedAxis,
  Tooltip,
  buildChartTheme,
} from '@visx/xychart';
import { useParentSize } from '@visx/responsive';
import { curveCardinal } from '@visx/curve';

export default function MultiStockChart({ stocks, colors, height = 400 }) {
  const { parentRef, width } = useParentSize();

  // Transform data for visx - create combined dataset with percentage changes
  const chartData = useMemo(() => {
    if (!stocks || stocks.length === 0) return { data: [], stocks: [] };

    // Find the global date range across all stocks
    let minDate = Infinity;
    let maxDate = -Infinity;

    const transformedStocks = stocks.map((stock, index) => {
      if (!stock.data || stock.data.length === 0) return null;

      // Parse dates and find min/max for this stock
      const parsedData = stock.data.map(item => {
        const date = new Date(item.date);
        if (date < minDate) minDate = date;
        if (date > maxDate) maxDate = date;

        return {
          date,
          price: parseFloat(item.close_price),
          ticker: stock.ticker,
          color: stock.color,
        };
      });

      return {
        ticker: stock.ticker,
        data: parsedData,
        color: stock.color,
        startingPrice: parsedData[0]?.price || 0, // Store starting price for percentage calculation
      };
    }).filter(Boolean);

    // Create a combined dataset with all dates
    const allDates = new Set();
    transformedStocks.forEach(stock => {
      stock.data.forEach(item => allDates.add(item.date.getTime()));
    });

    const sortedDates = Array.from(allDates).sort((a, b) => a - b);
    const dateObjects = sortedDates.map(timestamp => new Date(timestamp));

    // Create combined data points - fill missing dates for each stock with percentage changes
    const combinedData = dateObjects.map(date => {
      const dataPoint = { date };

      transformedStocks.forEach(stock => {
        const stockDataPoint = stock.data.find(d => d.date.getTime() === date.getTime());
        if (stockDataPoint && stock.startingPrice > 0) {
          // Calculate percentage change from starting price
          const percentageChange = ((stockDataPoint.price - stock.startingPrice) / stock.startingPrice) * 100;
          dataPoint[stock.ticker] = percentageChange;
        } else if (stock.startingPrice > 0) {
          // Find the closest previous data point for this stock and calculate percentage
          const previousDataPoint = stock.data
            .filter(d => d.date < date)
            .sort((a, b) => b.date - a.date)[0];

          if (previousDataPoint) {
            const percentageChange = ((previousDataPoint.price - stock.startingPrice) / stock.startingPrice) * 100;
            dataPoint[stock.ticker] = percentageChange;
          } else {
            dataPoint[stock.ticker] = 0; // Starting point (0% change)
          }
        } else {
          dataPoint[stock.ticker] = null;
        }
      });

      return dataPoint;
    });

    return {
      data: combinedData,
      stocks: transformedStocks,
      dateRange: { min: minDate, max: maxDate }
    };
  }, [stocks]);

  // Create theme with multiple colors
  const theme = useMemo(() => {
    const baseTheme = buildChartTheme({
      backgroundColor: 'transparent',
      colors: colors,
      gridColor: '#e5e5e5',
      gridColorDark: '#d1d5db',
      tickLength: 4
    });

    return baseTheme;
  }, [colors]);

  // Data accessors
  const accessors = {
    xAccessor: (d) => d?.date,
    yAccessor: (d) => d?.percentage || 0,
  };

  // Custom tooltip
  const renderTooltip = ({ tooltipData }) => {
    if (!tooltipData?.nearestDatum?.datum) return null;

    const datum = tooltipData.nearestDatum.datum;
    const stocksInTooltip = chartData.stocks.filter(stock =>
      datum[stock.ticker] !== null && datum[stock.ticker] !== undefined
    );

    return (
      <div className="bg-white p-4 border border-gray-300 rounded shadow-lg text-sm min-w-[200px] max-w-[90vw]">
        <div className="font-medium mb-2 text-gray-800 truncate">
          {datum.date.toLocaleDateString()}
        </div>
        <div className="space-y-1">
          {stocksInTooltip.map(stock => {
            const percentage = datum[stock.ticker];
            const isPositive = percentage > 0;
            const isNegative = percentage < 0;

            return (
              <div key={stock.ticker} className="flex items-center gap-2 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stock.color }}
                />
                <span className="font-medium truncate flex-shrink">{stock.ticker}:</span>
                <span className={`font-semibold flex-shrink-0 ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'}`}>
                  {isPositive ? '+' : ''}{percentage?.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Format axis labels
  const formatDateTick = (date) => {
    const firstDate = chartData.dateRange?.min;
    const lastDate = chartData.dateRange?.max;

    if (!firstDate || !lastDate) return '';

    const totalMonths = (lastDate.getTime() - firstDate.getTime()) / (30 * 24 * 60 * 60 * 1000);
    const showYearsOnly = totalMonths > 24;

    if (showYearsOnly) {
      return date.getFullYear().toString();
    } else {
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${year}`;
    }
  };

  const formatPercentageTick = (value) => {
    if (value === null || value === undefined) return '0%';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(0)}%`;
  };

  if (!width || width === 0) {
    return <div ref={parentRef} className="w-full" style={{ height }} />;
  }

  if (!chartData.data || chartData.data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
        No data available for chart
      </div>
    );
  }

  return (
    <div ref={parentRef} className="w-full space-y-0 overflow-x-hidden" style={{ height }}>
      <XYChart
        theme={theme}
        xScale={{ type: 'time' }}
        yScale={{ type: 'linear' }}
        width={width}
        height={height}
        margin={{ top: 20, right: 10, bottom: 20, left: 40 }}
      >
        {/* Grid and Axes */}
        <AnimatedAxis
          orientation="bottom"
          tickFormat={formatDateTick}
          numTicks={Math.min(8, Math.floor(width / 100))}
        />
        <AnimatedAxis
          orientation="left"
          tickFormat={formatPercentageTick}
          numTicks={6}
        />

        {/* Multiple line series - one for each stock */}
        {chartData.stocks.map((stock) => (
          <AnimatedLineSeries
            key={stock.ticker}
            dataKey={stock.ticker}
            data={chartData.data}
            xAccessor={accessors.xAccessor}
            yAccessor={(d) => d[stock.ticker] || 0}
            strokeWidth={2}
            curve={curveCardinal}
          />
        ))}

        {/* Tooltip */}
        <Tooltip
          snapTooltipToDatumX
          snapTooltipToDatumY
          showVerticalCrosshair
          renderTooltip={renderTooltip}
        />
      </XYChart>
    </div>
  );
}

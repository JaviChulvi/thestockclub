'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import {
  XYChart,
  AnimatedLineSeries,
  AnimatedAreaSeries,
  AnimatedAxis,
  Tooltip,
  buildChartTheme,
  AnnotationLineSubject,
  Annotation,
} from '@visx/xychart';
import { useParentSize } from '@visx/responsive';
import { scaleTime, scaleLinear } from '@visx/scale';
import { curveCardinal } from '@visx/curve'
import { getCurrencySymbol } from '@/lib/utils';
function PriceChart({ priceData, isPositive, mainFundPage = false, color = null, chatArtifact = false, currency = 'USD' }) {
  // Transform and prepare data for visx
  const chartData = useMemo(() => {
    // If no price data, return empty array
    if (!priceData || priceData.length === 0) {
      return [];
    }

    // Sort price data by date (oldest first)
    const sortedData = [...priceData].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Parse dates and handle different formats
    const transformedData = [];
    
    sortedData.forEach((item) => {
      const dateStr = item.date;
      let date;
      
      // Handle different date formats
      if (typeof dateStr === 'string') {
        if (dateStr.includes('GMT') || dateStr.includes('UTC') || dateStr.includes(',')) {
          // Handle GMT format like "Tue, 22 Jul 2025 00:00:00 GMT"
          date = new Date(dateStr);
        } else if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            // Detect DD/MM/YYYY vs MM/DD/YYYY format
            let day, month, year;
            
            // If first part > 12, it's DD/MM/YYYY format
            if (parseInt(parts[0]) > 12) {
              day = parts[0].padStart(2, '0');
              month = parts[1].padStart(2, '0');
              year = parts[2];
            } else if (parseInt(parts[1]) > 12) {
              // If second part > 12, it's MM/DD/YYYY format
              month = parts[0].padStart(2, '0');
              day = parts[1].padStart(2, '0');
              year = parts[2];
            } else {
              // Ambiguous case - assume DD/MM/YYYY (European format)
              day = parts[0].padStart(2, '0');
              month = parts[1].padStart(2, '0');
              year = parts[2];
            }
            
            date = new Date(`${year}-${month}-${day}T00:00:00Z`);
          } else {
            date = new Date(dateStr);
          }
        } else {
          // Assume ISO format or other standard format
          date = new Date(dateStr);
        }
      } else {
        date = new Date(dateStr);
      }
      
      // Skip invalid dates
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateStr);
        return;
      }
      
      transformedData.push({
        date: date,
        price: parseFloat(item.close_price)
      });
    });


    return transformedData;
  }, [priceData]);

  // Data accessors for visx
  const accessors = {
    xAccessor: (d) => d.date,
    yAccessor: (d) => d.price,
  };

  // Create theme based on chart type
  const theme = useMemo(() => {
    const chartColor = color || (mainFundPage
      ? '#000000' // Black for main page
      : (isPositive ? '#22c55e' : '#ef4444')); // Green/red for small charts

    const baseTheme = buildChartTheme({
      backgroundColor: 'transparent',
      colors: [chartColor],
      gridColor: '#e5e5e5',
      gridColorDark: '#d1d5db',
      tickLength: 4
    });

    return baseTheme;
  }, [isPositive, mainFundPage, color]);

  // Chart dimensions
  const chartHeight = mainFundPage ? 400 : 64;
  const minWidth = mainFundPage ? 320 : 200;

  return (
    <div className="relative w-full h-full">
      <div className="w-full h-full">
        {chartData && chartData.length > 0 ? (
          <ResponsiveChart
            data={chartData}
            accessors={accessors}
            theme={theme}
            height={chartHeight}
            minWidth={minWidth}
            mainFundPage={mainFundPage}
            isPositive={isPositive}
            color={color}
            chatArtifact={chatArtifact}
            currency={currency}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            {!mainFundPage ? '' : 'No data available'}
          </div>
        )}
      </div>
    </div>
  );
}

// ResponsiveChart component using visx
function ResponsiveChart({
  data,
  accessors,
  theme,
  height,
  minWidth,
  mainFundPage,
  isPositive,
  color,
  chatArtifact,
  currency
}) {
  const { parentRef, width, parentHeight } = useParentSize();
  
  // Use parentHeight for main fund page, fixed height for small charts
  const chartHeight = mainFundPage ? Math.max(parentHeight || height, 300) : height;
  const chartWidth = Math.max(width || minWidth, minWidth);

  // Format tooltip content
  const renderTooltip = ({ tooltipData }) => {
    if (!tooltipData?.nearestDatum?.datum) return null;
    
    const datum = tooltipData.nearestDatum.datum;
    const date = accessors.xAccessor(datum);
    const price = accessors.yAccessor(datum);
    
    return (
      <div className="bg-white p-2 border border-gray-300 rounded shadow-lg text-sm">
        <div className="font-medium">
          {date.toLocaleDateString()}
        </div>
        <div className="text-gray-600">
          {getCurrencySymbol(currency)}{price.toFixed(2)}
        </div>
      </div>
    );
  };

  // Format axis labels
  const formatDateTick = (date) => {
    if (!data || data.length === 0) return '';
    
    const firstDate = accessors.xAccessor(data[0]);
    const lastDate = accessors.xAccessor(data[data.length - 1]);
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

  const formatPriceTick = (price) => `€${price.toFixed(2)}`;

  // Calculate Y-scale domain for better visibility - always start from actual price range, never from 0
  const yScaleConfig = useMemo(() => {
    if (!data || data.length === 0) {
      return { type: 'linear' };
    }

    // For both small and main charts, calculate min/max and use tight bounds for maximum visibility
    const prices = data.map(d => accessors.yAccessor(d));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    if (minPrice === maxPrice) {
      // If all prices are the same, show a very small range around that price
      const variation = Math.max(0.1, minPrice * 0.002); // 0.2% variation minimum
      return { 
        type: 'linear',
        domain: [minPrice - variation, maxPrice + variation],
        nice: false,
        zero: false
      };
    }

    const priceRange = maxPrice - minPrice;
    
    // Use minimal padding for maximum price movement visibility
    // For small charts: even tighter (0.5% padding)
    // For main charts: slightly more (2% padding) for better readability
    const paddingPercent = mainFundPage ? 0.02 : 0.005;
    const padding = Math.max(priceRange * paddingPercent, 0.01); // At least 1 cent padding
    
    const domainMin = minPrice - padding;
    const domainMax = maxPrice + padding;

    return { 
      type: 'linear',
      domain: [domainMin, domainMax],
      nice: false,
      zero: false
    };
  }, [data, accessors, mainFundPage]);

  // Calculate reference line (starting price) - must be before early return to maintain hook order
  const referenceLine = useMemo(() => {
    if (!data || data.length === 0) return null;
    return accessors.yAccessor(data[0]); // First price in the series
  }, [data, accessors]);

  if (!width || width === 0) {
    return <div ref={parentRef} className="w-full h-full" />;
  }
  let margin = { top: 2, right: 2, bottom: 2, left: 2 };
  if (chatArtifact) {
    margin = { top: 10, right: 20, bottom: 20, left: 45 };
  } else if (mainFundPage) {
    margin = { top: 20, right: 20, bottom: 40, left: 60 } ;
  }

  return (
    <div ref={parentRef} className="w-full h-full overflow-hidden">
      <XYChart
        theme={theme}
        xScale={{ type: 'time' }}
        yScale={yScaleConfig}
        width={chartWidth}
        height={chartHeight}
        margin={margin}
      >
        {/* Grid - only show for main fund page */}
        {mainFundPage && (
          <>
            <AnimatedAxis
              orientation="bottom"
              tickFormat={formatDateTick}
              numTicks={Math.min(6, Math.floor(chartWidth / 100))}
            />
            <AnimatedAxis
              orientation="left"
              tickFormat={formatPriceTick}
              numTicks={5}
            />
          </>
        )}

        {/* Reference line at starting price - only for small charts */}
        {!mainFundPage && referenceLine !== null && (
          <Annotation
            dataKey="reference"
            datum={{ date: accessors.xAccessor(data[Math.floor(data.length / 2)]), price: referenceLine }}
            dx={0}
            dy={0}
          >
            <AnnotationLineSubject
              orientation="horizontal"
              stroke="#9ca3af"
              strokeWidth={1}
              strokeDasharray="3,3"
              strokeOpacity={0.5}
            />
          </Annotation>
        )}

        {/* Use AreaSeries for small charts (with fill), LineSeries for main page */}
        {!mainFundPage ? (
          <AnimatedAreaSeries
            dataKey="price"
            data={data}
            xAccessor={accessors.xAccessor}
            yAccessor={accessors.yAccessor}
            fillOpacity={0.2}
            strokeWidth={2}
            curve={curveCardinal}
          />
        ) : (
          <AnimatedLineSeries
            dataKey="price"
            data={data}
            xAccessor={accessors.xAccessor}
            yAccessor={accessors.yAccessor}
            strokeWidth={2}
            curve={curveCardinal}
          />
        )}

        {/* Tooltip - only for main fund page */}
        {mainFundPage && (
          <Tooltip
            snapTooltipToDatumX
            snapTooltipToDatumY
            showVerticalCrosshair
            renderTooltip={renderTooltip}
          />
        )}
      </XYChart>
    </div>
  );
}

export default PriceChart;
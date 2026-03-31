'use client';

import { useState, useMemo } from 'react';

/**
 * Hook for sortable table data.
 *
 * @param {Array} items - The data array to sort
 * @param {Function} getValueFn - (item, key) => value to sort by
 * @returns {{ sortedItems, sortConfig, handleSort }}
 */
export function useSortableData(items, getValueFn) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedItems = useMemo(() => {
    if (!sortConfig.key) return items;

    return [...items].sort((a, b) => {
      const aValue = getValueFn(a, sortConfig.key);
      const bValue = getValueFn(b, sortConfig.key);

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortConfig, getValueFn]);

  return { sortedItems, sortConfig, handleSort };
}

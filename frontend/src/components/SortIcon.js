'use client';

import { memo } from 'react';

function SortIcon({ columnKey, sortConfig }) {
  if (sortConfig.key !== columnKey) {
    return <span className="text-gray-400 ml-1">⇅</span>;
  }
  return (
    <span className="ml-1">
      {sortConfig.direction === 'asc' ? '↑' : '↓'}
    </span>
  );
}

export default memo(SortIcon);

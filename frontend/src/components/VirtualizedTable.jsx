/**
 * VirtualizedTable - ตารางที่มี scroll limit + lazy rendering
 * ใช้ simple approach แทน react-window (ข้อมูลไม่ใหญ่มาก)
 */

import { useState } from 'react';

const INITIAL_ROWS = 30;

export default function VirtualizedTable({ headers, rows, renderRow, maxHeight = 600, className = '' }) {
  const [showCount, setShowCount] = useState(INITIAL_ROWS);
  const visibleRows = rows.slice(0, showCount);
  const hasMore = showCount < rows.length;

  return (
    <div className={`overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center bg-slate-50 text-sm text-slate-500 border-b border-slate-200">
        {headers.map((h, i) => (
          <div key={i} className={`px-6 py-3 font-semibold ${h.className || ''}`} style={h.style || {}}>
            {h.label}
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{ maxHeight, overflowY: 'auto' }}>
        {visibleRows.map((row, i) => (
          <div key={row.id || i}>
            {renderRow(row, i)}
          </div>
        ))}
        {hasMore && (
          <div className="px-6 py-3 text-center border-t border-slate-100">
            <button
              onClick={() => setShowCount(prev => prev + INITIAL_ROWS)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              แสดงอีก {Math.min(INITIAL_ROWS, rows.length - showCount)} รายการ (ทั้งหมด {rows.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

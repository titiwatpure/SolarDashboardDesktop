/**
 * VirtualizedTable - ตารางที่ใช้ react-window สำหรับข้อมูลจำนวนมาก
 * ใช้ List สำหรับ performance (rows สูงเท่ากัน)
 */

import { useRef, useCallback } from 'react';
import { List } from 'react-window';

export default function VirtualizedTable({ headers, rows, renderRow, rowHeight = 52, maxHeight = 600, className = '' }) {
  const listRef = useRef(null);

  const Row = useCallback(({ index, style }) => (
    <div style={style}>
      {renderRow(rows[index], index)}
    </div>
  ), [rows, renderRow]);

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

      {/* Virtualized Body */}
      <List
        ref={listRef}
        height={Math.min(maxHeight, rows.length * rowHeight)}
        itemCount={rows.length}
        itemSize={rowHeight}
        width="100%"
      >
        {Row}
      </List>
    </div>
  );
}

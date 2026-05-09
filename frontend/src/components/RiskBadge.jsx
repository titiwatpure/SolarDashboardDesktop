import React from 'react';
import { RISK_LEVELS } from '../utils/constants';

export default function RiskBadge({ level, showIcon = true }) {
  if (!level || level === 'low') return null;

  const config = RISK_LEVELS[level];
  if (!config) return null;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {showIcon && <span className="text-xs">{config.icon}</span>}
      {config.label}
    </span>
  );
}

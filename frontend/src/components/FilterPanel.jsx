import React from 'react';
import { PROVINCES, STATUS_LABELS, STEP_LABELS } from '../utils/constants';

export default function FilterPanel({ onFilterChange }) {
  const handleFilterChange = (filterName, value) => {
    onFilterChange({ [filterName]: value });
  };

  return (
    <div className="bg-white rounded-lg shadow-card p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">ตัวกรอง</h3>

      <div className="space-y-4">
        {/* Province Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">จังหวัด</label>
          <select
            onChange={(e) => handleFilterChange('province', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">ทั้งหมด</option>
            {PROVINCES.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">สถานะ</label>
          <select
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">ทั้งหมด</option>
            <option value="pending">{STATUS_LABELS.pending}</option>
            <option value="in_progress">{STATUS_LABELS.in_progress}</option>
            <option value="blocked">{STATUS_LABELS.blocked}</option>
            <option value="completed">{STATUS_LABELS.completed}</option>
          </select>
        </div>

        {/* Step Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ขั้นตอน</label>
          <select
            onChange={(e) => handleFilterChange('current_step', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">ทั้งหมด</option>
            <option value="survey">{STEP_LABELS.survey}</option>
            <option value="design">{STEP_LABELS.design}</option>
            <option value="erc">{STEP_LABELS.erc}</option>
            <option value="grid">{STEP_LABELS.grid}</option>
            <option value="construction">{STEP_LABELS.construction}</option>
            <option value="testing">{STEP_LABELS.testing}</option>
            <option value="cod">{STEP_LABELS.cod}</option>
          </select>
        </div>
      </div>
    </div>
  );
}

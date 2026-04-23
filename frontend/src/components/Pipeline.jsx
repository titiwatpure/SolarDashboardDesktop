import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { STEP_LABELS, STEP_ORDER } from '../utils/constants';
import { projectsAPI } from '../utils/api';

export default function Pipeline() {
  const [stepStats, setStepStats] = useState({});

  useEffect(() => {
    loadStepStats();
  }, []);

  const loadStepStats = async () => {
    try {
      const data = await projectsAPI.getAll({ limit: 1000 });
      const stats = {};
      STEP_ORDER.forEach((step) => {
        stats[step] = 0;
      });

      data.data?.forEach((project) => {
        if (stats[project.current_step] !== undefined) {
          stats[project.current_step]++;
        }
      });

      setStepStats(stats);
    } catch (error) {
      console.error('Failed to load step stats:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-card p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-6">Pipeline ขั้นตอนงาน</h2>

      <div className="flex items-center gap-2 overflow-x-auto pb-4">
        {STEP_ORDER.map((step, index) => (
          <React.Fragment key={step}>
            <div className="flex flex-col items-center min-w-max">
              <div className="bg-primary-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-sm">
                {stepStats[step] || 0}
              </div>
              <p className="text-xs font-medium text-gray-700 mt-2 text-center">
                {STEP_LABELS[step]}
              </p>
            </div>
            {index < STEP_ORDER.length - 1 && (
              <ArrowRight size={20} className="text-gray-300 mx-1" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

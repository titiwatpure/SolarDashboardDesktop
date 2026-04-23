import React, { useState, useEffect } from 'react';
import { TrendingUp, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { projectsAPI } from '../utils/api';

export default function KPICards() {
  const [kpis, setKpis] = useState({
    total_projects: 0,
    completed: 0,
    in_progress: 0,
    blocked: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    try {
      const data = await projectsAPI.getKPIs();
      setKpis(data);
    } catch (error) {
      console.error('Failed to load KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const kpiData = [
    {
      title: 'จำนวนโครงการทั้งหมด',
      value: kpis.total_projects,
      icon: Zap,
      color: 'bg-primary-600',
      textColor: 'text-primary-600',
    },
    {
      title: 'เสร็จแล้ว (COD)',
      value: kpis.completed,
      icon: CheckCircle,
      color: 'bg-success',
      textColor: 'text-success',
    },
    {
      title: 'กำลังดำเนินการ',
      value: kpis.in_progress,
      icon: TrendingUp,
      color: 'bg-warning',
      textColor: 'text-warning',
    },
    {
      title: 'ติดปัญหา',
      value: kpis.blocked,
      icon: AlertCircle,
      color: 'bg-danger',
      textColor: 'text-danger',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpiData.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.title}
            className="bg-white rounded-lg shadow-card p-6 border-l-4 border-primary-600"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{kpi.title}</p>
                <p className={`text-3xl font-bold ${kpi.textColor} mt-2`}>
                  {kpis ? kpi.value : '-'}
                </p>
              </div>
              <div className={`${kpi.color} p-3 rounded-full`}>
                <Icon size={24} className="text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { CheckSquare, Zap, Loader } from 'lucide-react';
import { reportsAPI } from '../utils/api';
import { STEP_LABELS, STATUS_LABELS, STATUS_COLORS } from '../utils/constants';

const steps = [
  { key: 'survey', name: 'สำรวจ', label: 'Survey', color: 'bg-blue-500' },
  { key: 'design', name: 'ออกแบบ', label: 'Design', color: 'bg-blue-600' },
  { key: 'erc', name: 'ERC', label: 'ERC', color: 'bg-blue-700' },
  { key: 'grid', name: 'Grid', label: 'Grid', color: 'bg-blue-800' },
  { key: 'construction', name: 'ก่อสร้าง', label: 'Construction', color: 'bg-orange-500' },
  { key: 'testing', name: 'ทดสอบ', label: 'Testing', color: 'bg-orange-600' },
  { key: 'cod', name: 'COD', label: 'COD', color: 'bg-green-600' },
];

export default function Steps() {
  const [stepData, setStepData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await reportsAPI.getSummaryByStepStatus();
      setStepData(Array.isArray(data) ? data : (data.data || []));
    } catch (error) {
      console.error('Failed to load step data:', error);
    } finally {
      setLoading(false);
    }
  };

  // สร้าง map สำหรับ lookup ง่ายๆ
  const stepMap = {};
  stepData.forEach((s) => {
    stepMap[s.step] = s;
  });

  const totalProjects = stepData.reduce((sum, s) => sum + (s.count || 0), 0);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <CheckSquare size={22} />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">ปฏิบัติงาน</h1>
            <p className="mt-2 text-base text-slate-500">
              ติดตามขั้นตอนการดำเนินงานของโครงการทั้งหมดในระบบ
            </p>
          </div>
        </div>
      </section>

      {/* Workflow Diagram */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-8">Pipeline ขั้นตอนงานโครงการ Solar</h2>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {steps.map((step, index) => {
            const data = stepMap[step.key];
            const count = data?.count || 0;

            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center">
                  <div className={`${step.color} text-white rounded-full w-20 h-20 flex items-center justify-center font-bold text-center text-sm p-2`}>
                    {step.label}
                  </div>
                  <p className="text-sm font-medium text-slate-700 mt-2 text-center">{step.name}</p>
                  <p className="text-lg font-bold text-slate-900">{count}</p>
                  <p className="text-xs text-slate-500">โครงการ</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-8 h-1 bg-slate-300 mb-6"></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </section>

      {/* Step Details + Status Breakdown */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-6">รายละเอียดแต่ละขั้นตอน</h2>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-500">
            <Loader size={20} className="animate-spin mr-2" />
            กำลังโหลด...
          </div>
        ) : (
          <div className="space-y-4">
            {steps.map((step) => {
              const data = stepMap[step.key];
              const count = data?.count || 0;
              const completed = data?.completed || 0;
              const inProgress = data?.in_progress || 0;
              const notStarted = data?.not_started || 0;
              const blocked = data?.blocked || 0;

              return (
                <div key={step.key} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 ${step.color} rounded`}></div>
                      <h3 className="font-bold text-slate-900">{step.name} ({step.label})</h3>
                    </div>
                    <span className="text-2xl font-bold text-slate-900">{count} โครงการ</span>
                  </div>

                  {count > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {notStarted > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {STATUS_LABELS.not_started}: {notStarted}
                        </span>
                      )}
                      {inProgress > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {STATUS_LABELS.in_progress}: {inProgress}
                        </span>
                      )}
                      {completed > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {STATUS_LABELS.completed}: {completed}
                        </span>
                      )}
                      {blocked > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          {STATUS_LABELS.blocked}: {blocked}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">ยังไม่มีโครงการในขั้นตอนนี้</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Summary Bar */}
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-6">สรุปสถิติ</h2>
        <div className="space-y-4">
          {steps.map((step) => {
            const data = stepMap[step.key];
            const count = data?.count || 0;
            const percentage = totalProjects > 0 ? (count / totalProjects) * 100 : 0;

            return (
              <div key={step.key} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-4 h-4 ${step.color} rounded`}></div>
                  <span className="text-sm font-medium text-slate-700">{step.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-slate-200 rounded-full h-2">
                    <div className={`${step.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 w-20 text-right">{count} โครงการ</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

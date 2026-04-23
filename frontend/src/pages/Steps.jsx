import React from 'react';
import { CheckSquare, Zap } from 'lucide-react';

export default function Steps() {
  const steps = [
    { name: 'สำรวจ', label: 'Survey', color: 'bg-blue-500' },
    { name: 'ออกแบบ', label: 'Design', color: 'bg-blue-600' },
    { name: 'ERC', label: 'ERC', color: 'bg-blue-700' },
    { name: 'Grid', label: 'Grid', color: 'bg-blue-800' },
    { name: 'ก่อสร้าง', label: 'Construction', color: 'bg-orange-500' },
    { name: 'ทดสอบ', label: 'Testing', color: 'bg-orange-600' },
    { name: 'COD', label: 'COD', color: 'bg-green-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CheckSquare size={32} className="text-primary-600" />
        <h1 className="text-3xl font-bold text-gray-900">ขั้นตอนงาน</h1>
      </div>

      {/* Workflow Diagram */}
      <div className="bg-white rounded-lg shadow-card p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-8">Pipeline ขั้นตอนงานโครงการ Solar</h2>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center">
                <div className={`${step.color} text-white rounded-full w-20 h-20 flex items-center justify-center font-bold text-center text-sm p-2`}>
                  {step.label}
                </div>
                <p className="text-sm font-medium text-gray-700 mt-2 text-center">{step.name}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="w-8 h-1 bg-gray-300 mb-6"></div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Details */}
        <div className="mt-12 space-y-6">
          {steps.map((step) => (
            <div key={step.label} className="border-l-4 border-primary-600 pl-6 py-4">
              <h3 className="font-bold text-gray-900 text-lg">{step.name} ({step.label})</h3>
              <p className="text-sm text-gray-600 mt-1">
                รายละเอียดขั้นตอนการดำเนินงาน...
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Step Statistics */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">สถิติตามขั้นตอน</h2>
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-4 h-4 ${step.color} rounded`}></div>
                <span className="text-sm font-medium text-gray-700">{step.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className={`${step.color} h-2 rounded-full`} style={{ width: '0%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900">0 โครงการ</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { reportsAPI } from '../utils/api';

export default function Reports() {
  const [statusData, setStatusData] = useState([]);
  const [sizeData, setSizeData] = useState([]);
  const [provinceData, setProvinceData] = useState([]);
  const [stepData, setStepData] = useState([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const [status, size, province, step] = await Promise.all([
        reportsAPI.getSummaryByStatus(),
        reportsAPI.getSummaryBySize(),
        reportsAPI.getSummaryByProvince(),
        reportsAPI.getSummaryByStep(),
      ]);

      setStatusData(status);
      setSizeData(size);
      setProvinceData(province);
      setStepData(step);
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  };

  const COLORS = ['#0066cc', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">รายงาน</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
          <Download size={20} />
          Export PDF
        </button>
      </div>

      {/* Status Summary */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">สรุปตามสถานะ</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name} ${percentage}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="count"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Size Summary */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">สรุปตามขนาด</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sizeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="size_category" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#0066cc" name="จำนวน" />
            <Bar dataKey="total_capacity" fill="#10b981" name="ความจุรวม (kW)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Provinces */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">สรุปตามจังหวัด (Top 10)</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">จังหวัด</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">จำนวน</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">เสร็จแล้ว</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">อัตราสำเร็จ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {provinceData.slice(0, 10).map((row) => (
                <tr key={row.province} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.province}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{row.count}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{row.completed}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${row.completion_rate}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { FileUp, Download } from 'lucide-react';
import { documentsAPI } from '../utils/api';
import { DOCUMENT_TYPES } from '../utils/constants';

export default function Documents() {
  const [documents, setDocuments] = useState([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">เอกสาร</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
          <FileUp size={20} />
          อัปโหลดเอกสาร
        </button>
      </div>

      {/* Document Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
          <div key={key} className="bg-white rounded-lg shadow-card p-6 text-center">
            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileUp size={24} className="text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900">{label}</h3>
            <p className="text-2xl font-bold text-primary-600 mt-2">0</p>
            <p className="text-xs text-gray-500 mt-1">ไฟล์</p>
          </div>
        ))}
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ชื่อไฟล์</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ประเภท</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">โครงการ</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">อัปโหลดเมื่อ</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  ไม่มีเอกสาร
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

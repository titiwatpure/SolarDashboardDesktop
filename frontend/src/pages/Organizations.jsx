import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { organizationsAPI } from '../utils/api';
import { ORG_TYPES } from '../utils/constants';

export default function Organizations() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const data = await organizationsAPI.getAll();
      setOrganizations(data);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">หน่วยงาน</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium">
          <Plus size={20} />
          เพิ่มหน่วยงาน
        </button>
      </div>

      {/* Organizations Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {organizations.map((org) => (
          <div key={org.id} className="bg-white rounded-lg shadow-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{org.org_name}</h3>
                <p className="text-sm text-gray-600 mt-1">{ORG_TYPES[org.org_type]}</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded">
                  <Edit2 size={16} className="text-blue-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {org.status === 'active' ? 'ทำงาน' : 'ไม่ทำงาน'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {loading && <div className="text-center py-8">กำลังโหลด...</div>}
    </div>
  );
}

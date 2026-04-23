import React from 'react';
import { Bell, Shield, Globe } from 'lucide-react';

export default function Settings() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900">ตั้งค่า</h1>

      {/* General Settings */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">ตั้งค่าทั่วไป</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ชื่อสถาบัน
            </label>
            <input
              type="text"
              defaultValue="Solar Dashboard"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              โลโก้
            </label>
            <input
              type="file"
              accept="image/*"
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={24} className="text-primary-600" />
          <h2 className="text-lg font-bold text-gray-900">ความปลอดภัย</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เปลี่ยนรหัสผ่าน
            </label>
            <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">
              เปลี่ยนรหัสผ่าน
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Two-Factor Authentication
            </label>
            <button className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">
              เปิดใช้งาน
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell size={24} className="text-primary-600" />
          <h2 className="text-lg font-bold text-gray-900">การแจ้งเตือน</h2>
        </div>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm text-gray-700">แจ้งเตือนเมื่อมีการอัปเดตโครงการ</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm text-gray-700">แจ้งเตือนเมื่อมีโครงการติดปัญหา</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4 text-primary-600 rounded" />
            <span className="text-sm text-gray-700">แจ้งเตือนรายงานประจำสัปดาห์</span>
          </label>
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe size={24} className="text-primary-600" />
          <h2 className="text-lg font-bold text-gray-900">ระบบ</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ภาษา
            </label>
            <select className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option>ไทย</option>
              <option>English</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              วันที่/เวลา
            </label>
            <select className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option>Bangkok (GMT+7)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3">
        <button className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">
          บันทึก
        </button>
        <button className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

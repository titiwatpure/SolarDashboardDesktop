import React, { useState } from 'react';
import { Bell, Shield, Globe, Save, RotateCcw } from 'lucide-react';

export default function Settings() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // TODO: เชื่อมต่อ API บันทึกการตั้งค่าจริง
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (window.confirm('ต้องการรีเซ็ตการตั้งค่าทั้งหมดหรือไม่?')) {
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Globe size={22} />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">ตั้งค่า</h1>
            <p className="mt-2 text-base text-slate-500">จัดการการตั้งค่าทั่วไปของระบบ</p>
          </div>
        </div>
      </section>

      {/* General Settings */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">ตั้งค่าทั่วไป</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อสถาบัน</label>
            <input
              type="text"
              defaultValue="Solar Dashboard"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">โลโก้</label>
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={24} className="text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">ความปลอดภัย</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">เปลี่ยนรหัสผ่าน</label>
            <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              เปลี่ยนรหัสผ่าน
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Two-Factor Authentication</label>
            <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              เปิดใช้งาน
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Bell size={24} className="text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">การแจ้งเตือน</h2>
        </div>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
            <span className="text-sm text-slate-700">แจ้งเตือนเมื่อมีการอัปเดตโครงการ</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded" />
            <span className="text-sm text-slate-700">แจ้งเตือนเมื่อมีโครงการติดปัญหา</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
            <span className="text-sm text-slate-700">แจ้งเตือนรายงานประจำสัปดาห์</span>
          </label>
        </div>
      </div>

      {/* System Settings */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Globe size={24} className="text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">ระบบ</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">ภาษา</label>
            <select className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400">
              <option>ไทย</option>
              <option>English</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">วันที่/เวลา</label>
            <select className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400">
              <option>Bangkok (GMT+7)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Save size={16} />
          {saved ? 'บันทึกสำเร็จ!' : 'บันทึก'}
        </button>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RotateCcw size={16} />
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

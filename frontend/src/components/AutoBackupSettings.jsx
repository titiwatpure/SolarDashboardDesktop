import { useState, useEffect } from 'react';
import { Clock, RefreshCw, CheckCircle, HardDrive } from 'lucide-react';
import { backupAPI } from '../utils/api';

export default function AutoBackupSettings({ onMessage }) {
  const [settings, setSettings] = useState({
    enabled: false,
    frequency: 'daily',
    time: '02:00',
    retentionDays: 30
  });
  const [loading, setLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState(null);
  const [nextBackup, setNextBackup] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await backupAPI.getSettings();
      if (data.settings) setSettings(data.settings);
      if (data.lastBackup) setLastBackup(data.lastBackup);
      if (data.nextBackup) setNextBackup(data.nextBackup);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleUpdate = async (updates) => {
    setLoading(true);
    try {
      const result = await backupAPI.updateSettings(updates);
      setSettings(result.settings);
      if (result.nextBackup) setNextBackup(result.nextBackup);
      onMessage?.({ type: 'success', text: 'อัปเดตตั้งค่าสำเร็จ' });
    } catch (err) {
      onMessage?.({ type: 'error', text: err.response?.data?.error || 'เกิดข้อผิดพลาด' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestBackup = async () => {
    setLoading(true);
    try {
      const result = await backupAPI.createAutoBackup();
      onMessage?.({ type: 'success', text: result.message || 'สร้าง backup สำเร็จ' });
      loadSettings();
    } catch (err) {
      onMessage?.({ type: 'error', text: err.response?.data?.error || 'เกิดข้อผิดพลาด' });
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
        <div>
          <p className="font-medium text-slate-900">เปิดใช้งาน Backup อัตโนมัติ</p>
          <p className="text-sm text-slate-500">ระบบจะ backup ให้อัตโนมัติตามเวลาที่กำหนด</p>
        </div>
        <button
          onClick={() => handleUpdate({ enabled: !settings.enabled })}
          disabled={loading}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            settings.enabled ? 'bg-blue-600' : 'bg-slate-300'
          }`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
            settings.enabled ? 'translate-x-6' : ''
          }`} />
        </button>
      </div>

      {settings.enabled && (
        <>
          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">ความถี่</label>
              <select
                value={settings.frequency}
                onChange={(e) => handleUpdate({ frequency: e.target.value })}
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
              >
                <option value="daily">ทุกวัน</option>
                <option value="weekly">ทุกสัปดาห์ (อาทิตย์)</option>
                <option value="monthly">ทุกเดือน (วันที่ 1)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">เวลา backup</label>
              <input
                type="time"
                value={settings.time}
                onChange={(e) => handleUpdate({ time: e.target.value })}
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">เก็บ backup นาน (วัน)</label>
              <input
                type="number"
                value={settings.retentionDays}
                onChange={(e) => handleUpdate({ retentionDays: parseInt(e.target.value) || 30 })}
                min="7"
                max="365"
                disabled={loading}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
            <Clock size={16} className="text-blue-600" />
            <p className="text-sm text-blue-700">
              {settings.frequency === 'daily' && `จะ backup ทุกวันเวลา ${settings.time}`}
              {settings.frequency === 'weekly' && `จะ backup ทุกวันอาทิตย์เวลา ${settings.time}`}
              {settings.frequency === 'monthly' && `จะ backup วันที่ 1 ของทุกเดือนเวลา ${settings.time}`}
              <span className="ml-2 text-blue-500">• เก็บ {settings.retentionDays} วัน</span>
            </p>
          </div>

          {/* Last Backup */}
          {lastBackup && (
            <div className="p-4 bg-emerald-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle size={18} className="text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-emerald-900">Auto Backup ทำงานปกติ</p>
                  <p className="text-sm text-emerald-700">backup ล่าสุด: {formatDateTime(lastBackup.created_at)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Test Button */}
          <button
            onClick={handleTestBackup}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            ทดสอบ Auto Backup ตอนนี้
          </button>
        </>
      )}
    </div>
  );
}

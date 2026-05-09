import { useEffect, useState } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle2, Clock, Loader } from 'lucide-react';
import { projectsAPI } from '../utils/api';
import { STATUS_LABELS, STATUS_COLORS, STEP_LABELS, STEP_ORDER } from '../utils/constants';

// ไอคอนประจำแต่ละสถานะ
const STATUS_ICONS = {
  pending:     <Clock     size={16} className="text-yellow-500" />,
  in_progress: <RefreshCw size={16} className="text-blue-500" />,
  blocked:     <AlertTriangle size={16} className="text-red-500" />,
  completed:   <CheckCircle2 size={16} className="text-green-500" />,
};

// สีขอบ card ตามสถานะ
const STATUS_BORDER = {
  pending:     'border-yellow-300 bg-yellow-50',
  in_progress: 'border-blue-300 bg-blue-50',
  blocked:     'border-red-300 bg-red-50',
  completed:   'border-green-300 bg-green-50',
};

export default function StatusModal({ isOpen, onClose, onUpdated, project }) {
  // ค่าเริ่มต้นของ form
  const [formData, setFormData] = useState({
    current_step:  '',
    status:        '',
    blocked_reason: '',
    actual_cod_date: '',
    previousStatus: '', // จำ status ก่อน auto-set completed เมื่อเข้า COD
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // โหลดค่าปัจจุบันของโครงการเข้า form เมื่อเปิด Modal
  useEffect(() => {
    if (!project) return;
    setError('');
    setFormData({
      current_step:    project.current_step    || 'survey',
      status:          project.status          || 'pending',
      blocked_reason:  project.blocked_reason  || '',
      actual_cod_date: project.actual_cod_date
        ? new Date(project.actual_cod_date).toISOString().slice(0, 10)
        : '',
      previousStatus:  project.status === 'completed' ? 'in_progress' : (project.status || 'pending'),
    });
  }, [project, isOpen]);

  // เมื่อเปลี่ยน current_step เป็น cod → จำ status เดิมแล้วบังคับเป็น completed
  // เมื่อเปลี่ยน current_step ออกจาก cod → คืน status เดิมกลับมา
  const handleStepChange = (step) => {
    setFormData((prev) => {
      if (step === 'cod') {
        // เข้า COD: จำ status ปัจจุบันก่อน auto-set completed
        return {
          ...prev,
          current_step: step,
          status: 'completed',
          previousStatus: prev.status,
        };
      }

      // ออกจาก COD: คืน status เดิม
      // ถ้า status ยังเป็น completed (auto-set) ให้กลับเป็น previousStatus
      // ถ้า status ถูกเปลี่ยนโดย user แล้ว ให้คงไว้
      return {
        ...prev,
        current_step: step,
        status: prev.status === 'completed' ? (prev.previousStatus || 'in_progress') : prev.status,
      };
    });
  };

  // เมื่อเปลี่ยน status ถ้าไม่ blocked ให้ล้าง blocked_reason
  const handleStatusChange = (status) => {
    setFormData((prev) => ({
      ...prev,
      status,
      blocked_reason: status !== 'blocked' ? '' : prev.blocked_reason,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // ตรวจสอบ: ถ้า blocked ต้องระบุสาเหตุ
    if (formData.status === 'blocked' && !formData.blocked_reason.trim()) {
      setError('กรุณาระบุสาเหตุที่ติดปัญหา');
      return;
    }

    try {
      setLoading(true);

      // สร้าง payload ที่จะส่งไป Backend
      const payload = {
        current_step:   formData.current_step,
        status:         formData.status,
        blocked_reason: formData.status === 'blocked' ? formData.blocked_reason.trim() : null,
        actual_cod_date: formData.status === 'completed' && formData.actual_cod_date
          ? formData.actual_cod_date
          : null,
      };

      await projectsAPI.update(project.id, payload);
      onUpdated?.();  // บอก Dashboard ให้ refresh ตาราง + KPI
      onClose();
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('เกิดข้อผิดพลาด ไม่สามารถอัปเดตสถานะได้');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !project) return null;

  // index ของขั้นตอนปัจจุบัน (ใช้วาด progress bar)
  const currentStepIndex = STEP_ORDER.indexOf(formData.current_step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* ===== Header ===== */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
              <RefreshCw size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">อัปเดตสถานะโครงการ</h2>
              {/* แสดงชื่อ + รหัสโครงการ */}
              <p className="text-xs text-slate-500">
                {project.project_name}
                <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">
                  {project.project_code}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-5">

            {/* ===== Progress Bar ขั้นตอน ===== */}
            <div>
              <p className="mb-3 text-sm font-semibold text-slate-700">ขั้นตอนปัจจุบัน</p>
              {/* แสดงขั้นตอนแบบ step ให้กดเลือก */}
              <div className="flex items-center gap-1">
                {STEP_ORDER.map((step, idx) => {
                  const isSelected = formData.current_step === step;
                  const isPast     = idx < currentStepIndex;
                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={() => handleStepChange(step)}
                      className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold transition
                        ${isSelected
                          ? 'bg-blue-600 text-white shadow'
                          : isPast
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                    >
                      {STEP_LABELS[step]}
                    </button>
                  );
                })}
              </div>
              {/* Progress line */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${((currentStepIndex + 1) / STEP_ORDER.length) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-slate-400">
                ขั้นตอนที่ {currentStepIndex + 1} / {STEP_ORDER.length}
              </p>
            </div>

            {/* ===== เลือกสถานะ ===== */}
            <div>
              <p className="mb-3 text-sm font-semibold text-slate-700">สถานะโครงการ</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUS_LABELS).map(([key, label]) => {
                  const isSelected = formData.status === key;
                  // ถ้า step = cod ให้ lock ที่ completed เท่านั้น
                  const isDisabled = formData.current_step === 'cod' && key !== 'completed';
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleStatusChange(key)}
                      className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition
                        ${isSelected
                          ? `${STATUS_BORDER[key]} border-2`
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}
                        ${isDisabled ? 'cursor-not-allowed opacity-40' : ''}`}
                    >
                      {STATUS_ICONS[key]}
                      <span>{label}</span>
                      {/* badge เพื่อแสดงว่า selected */}
                      {isSelected && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-current opacity-70" />
                      )}
                    </button>
                  );
                })}
              </div>
              {/* แจ้งเตือนเมื่อ step = cod */}
              {formData.current_step === 'cod' && (
                <p className="mt-2 flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 size={12} />
                  ขั้นตอน COD จะตั้งสถานะเป็น "เสร็จแล้ว" อัตโนมัติ
                </p>
              )}
            </div>

            {/* ===== ระบุสาเหตุ (แสดงเฉพาะ blocked) ===== */}
            {formData.status === 'blocked' && (
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-red-600">
                  <AlertTriangle size={14} />
                  สาเหตุที่ติดปัญหา <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.blocked_reason}
                  onChange={(e) => setFormData((prev) => ({ ...prev, blocked_reason: e.target.value }))}
                  rows={3}
                  placeholder="ระบุสาเหตุ เช่น รอเอกสารจาก กกพ., ติดปัญหาด้านพื้นที่..."
                  className="w-full rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-red-400 focus:bg-white"
                />
              </div>
            )}

            {/* ===== วันที่ COD จริง (แสดงเฉพาะ completed) ===== */}
            {formData.status === 'completed' && (
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-green-700">
                  <CheckCircle2 size={14} />
                  วันที่ COD จริง
                </label>
                <input
                  type="date"
                  value={formData.actual_cod_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, actual_cod_date: e.target.value }))}
                  className="w-full rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-green-400 focus:bg-white"
                />
              </div>
            )}

            {/* ===== แสดง Error ===== */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}
          </div>

          {/* ===== Footer ปุ่ม ===== */}
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            {/* แสดงสถานะปัจจุบัน (ก่อนอัปเดต) */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>สถานะเดิม:</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[project.status]}`}>
                {STATUS_LABELS[project.status]}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader size={14} className="animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    บันทึกสถานะ
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

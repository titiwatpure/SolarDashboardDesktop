import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, MapPin, Zap, FileText, Clock,
  Loader, User, Building2, AlertTriangle, Trash2, Plus, X, Save,
  MessageSquare, Send, Check, Minus, RefreshCw, UserCircle, DollarSign, Cpu
} from 'lucide-react';
import { projectsAPI } from '../utils/api';
import {
  STATUS_LABELS, STATUS_COLORS, STEP_LABELS, CUSTOMER_TYPES, MOUNTING_TYPES,
  PERMIT_TYPES
} from '../utils/constants';
import { useProjectDetail, useProjectCheckpoints } from '../hooks/useProjectDetail';

const stepMeta = {
  survey:       { color: 'bg-blue-500',   ring: 'ring-blue-200',   text: 'text-blue-600' },
  design:       { color: 'bg-blue-600',   ring: 'ring-blue-200',   text: 'text-blue-600' },
  erc:          { color: 'bg-blue-700',   ring: 'ring-blue-200',   text: 'text-blue-700' },
  grid:         { color: 'bg-blue-800',   ring: 'ring-blue-300',   text: 'text-blue-800' },
  construction: { color: 'bg-orange-500', ring: 'ring-orange-200', text: 'text-orange-600' },
  testing:      { color: 'bg-orange-600', ring: 'ring-orange-200', text: 'text-orange-600' },
  cod:          { color: 'bg-green-600',  ring: 'ring-green-200',  text: 'text-green-600' },
};

const stepOrder = ['survey', 'design', 'erc', 'grid', 'construction', 'testing', 'cod'];

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
};

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // สำหรับจัดการคอมเมนต์ detail.timeline
  const [expandedComments, setExpandedComments] = useState({});
  const [commentsMap, setCommentsMap] = useState({});
  const [commentTexts, setCommentTexts] = useState({});
  const [submittingComment, setSubmittingComment] = useState(false);

  // Hooks
  const detail = useProjectDetail(id);
  const cpHooks = useProjectCheckpoints(id, detail.project?.current_step);

  // โหลดคอมเมนต์ของ detail.timeline entry
  const loadComments = async (timelineId) => {
    try {
      const result = await projectsAPI.getTimelineComments(id, timelineId);
      setCommentsMap((prev) => ({ ...prev, [timelineId]: Array.isArray(result) ? result : (result.data || []) }));
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  // toggle แสดง/ซ่อนคอมเมนต์
  const toggleComments = (timelineId) => {
    const isExpanding = !expandedComments[timelineId];
    setExpandedComments((prev) => ({ ...prev, [timelineId]: !prev[timelineId] }));
    if (isExpanding && !commentsMap[timelineId]) {
      loadComments(timelineId);
    }
  };

  // เพิ่มคอมเมนต์
  const handleAddComment = async (timelineId) => {
    const text = (commentTexts[timelineId] || '').trim();
    if (!text) return;
    try {
      setSubmittingComment(true);
      await projectsAPI.addTimelineComment(id, timelineId, { comment: text });
      setCommentTexts((prev) => ({ ...prev, [timelineId]: '' }));
      await loadComments(timelineId);
      detail.setTimeline((prev) => prev.map((t) => t.id === timelineId ? { ...t, comment_count: (t.comment_count || 0) + 1 } : t));
      window.dispatchEvent(new Event('refresh-notifications'));
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  // ลบคอมเมนต์
  const handleDeleteComment = async (timelineId, commentId) => {
    if (!window.confirm('ต้องการลบคอมเมนต์นี้หรือไม่?')) return;
    try {
      await projectsAPI.deleteTimelineComment(id, timelineId, commentId);
      await loadComments(timelineId);
      detail.setTimeline((prev) => prev.map((t) => t.id === timelineId ? { ...t, comment_count: Math.max(0, (t.comment_count || 0) - 1) } : t));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  if (detail.loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader size={24} className="animate-spin mr-3" />
        กำลังโหลด...
      </div>
    );
  }

  if (!detail.project) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p className="text-lg">ไม่พบโครงการ</p>
        <button onClick={() => navigate('/projects')} className="mt-4 text-blue-600 hover:underline">
          กลับไปหน้าโครงการ
        </button>
      </div>
    );
  }

  const currentStepIndex = stepOrder.indexOf(detail.project.current_step);
  // หน่วยงานที่ยังไม่ได้เชื่อม
  const availableOrgs = detail.allOrgs.filter(o => !detail.projectOrgs.some(po => po.id === o.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate('/projects')}
              className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <p className="text-sm text-slate-500">{detail.project.project_code}</p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{detail.project.project_name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  stepMeta[detail.project.current_step]?.color || 'bg-slate-500'
                } text-white`}>
                  {STEP_LABELS[detail.project.current_step]}
                </span>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[detail.project.status]}`}>
                  {STATUS_LABELS[detail.project.status]}
                </span>
                {detail.project.permit_type && (
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    detail.project.permit_type === 'exemption' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {PERMIT_TYPES[detail.project.permit_type]}
                  </span>
                )}
              </div>
              <div className="mt-4 max-w-md">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-600">ความคืบหน้า</span>
                  <span className="text-sm font-bold text-slate-900">{detail.project.progress || 0}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      detail.project.progress >= 100 ? 'bg-emerald-500' :
                      detail.project.progress >= 60 ? 'bg-blue-500' :
                      detail.project.progress >= 30 ? 'bg-amber-500' : 'bg-slate-400'
                    }`}
                    style={{ width: `${detail.project.progress || 0}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{STEP_LABELS[detail.project.scope_start] || 'สำรวจ'}</span>
                  <span>{STEP_LABELS[detail.project.scope_end] || 'COD'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        {/* ซ้าย: ข้อมูลโครงการ + หน่วยงาน + ผู้รับผิดชอบ */}
        <div className="space-y-6">
          {/* ข้อมูลโครงการ */}
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-5">ข้อมูลโครงการ</h2>
            <div className="space-y-4">
              <InfoRow icon={Zap} label="ขนาด" value={`${detail.project.size_kw} kW / ${detail.project.size_kva || '-'} kVA`} />
              <InfoRow icon={MapPin} label="จังหวัด" value={detail.project.province} />
              <InfoRow icon={Calendar} label="วันที่เริ่ม" value={formatDate(detail.project.start_date)} />
              <InfoRow icon={Calendar} label="วันที่คาดว่าจะ COD" value={formatDate(detail.project.expected_cod_date)} />
              <InfoRow icon={Calendar} label="วันที่ COD จริง" value={formatDate(detail.project.actual_cod_date)} />
              <InfoRow icon={FileText} label="ขายไฟ" value={detail.project.has_power_selling ? 'มี' : 'ไม่มี'} />
              {detail.project.blocked_reason && (
                <InfoRow icon={AlertTriangle} label="เหตุผลที่ติดปัญหา" value={detail.project.blocked_reason} />
              )}
              {detail.project.description && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">รายละเอียด</p>
                  <p className="text-sm text-slate-700">{detail.project.description}</p>
                </div>
              )}
            </div>
          </section>

          {/* ข้อมูลลูกค้า */}
          {(detail.project.customer_name || detail.project.customer_id) && (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <UserCircle size={18} className="text-teal-600" /> ข้อมูลลูกค้า
              </h2>
              <div className="space-y-3">
                <InfoRow icon={UserCircle} label="ชื่อลูกค้า" value={detail.project.customer_name} />
                {detail.project.customer_type && <InfoRow icon={Building2} label="ประเภท" value={CUSTOMER_TYPES[detail.project.customer_type] || detail.project.customer_type} />}
                {detail.project.customer_contact_name && <InfoRow icon={User} label="ผู้ติดต่อ" value={detail.project.customer_contact_name} />}
                {detail.project.customer_contact_phone && <InfoRow icon={FileText} label="เบอร์โทร" value={detail.project.customer_contact_phone} />}
                {detail.project.customer_contact_email && <InfoRow icon={FileText} label="อีเมล" value={detail.project.customer_contact_email} />}
                {detail.project.customer_tax_id && <InfoRow icon={FileText} label="เลขภาษี" value={detail.project.customer_tax_id} />}
                {detail.project.customer_address && <InfoRow icon={MapPin} label="ที่อยู่" value={detail.project.customer_address} />}
              </div>
            </section>
          )}

          {/* สถานที่ติดตั้ง */}
          {(detail.project.site_address || detail.project.grid_station) && (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <MapPin size={18} className="text-orange-600" /> สถานที่ติดตั้ง
              </h2>
              <div className="space-y-3">
                {detail.project.site_address && <InfoRow icon={MapPin} label="ที่อยู่" value={detail.project.site_address} />}
                {detail.project.site_lat && detail.project.site_lng && (
                  <InfoRow icon={MapPin} label="พิกัด" value={`${detail.project.site_lat}, ${detail.project.site_lng}`} />
                )}
                {detail.project.grid_station && <InfoRow icon={Zap} label="สถานีไฟฟ้า" value={detail.project.grid_station} />}
                {detail.project.grid_voltage && <InfoRow icon={Zap} label="แรงดัน" value={detail.project.grid_voltage} />}
              </div>
            </section>
          )}

          {/* สัญญา/การเงิน */}
          {(detail.project.contract_number || detail.project.contract_value || detail.project.budget) && (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <DollarSign size={18} className="text-green-600" /> สัญญา / การเงิน
              </h2>
              <div className="space-y-3">
                {detail.project.contract_number && <InfoRow icon={FileText} label="เลขที่สัญญา" value={detail.project.contract_number} />}
                {detail.project.contract_date && <InfoRow icon={Calendar} label="วันที่เซ็น" value={formatDate(detail.project.contract_date)} />}
                {detail.project.contract_value && <InfoRow icon={DollarSign} label="มูลค่าสัญญา" value={`${Number(detail.project.contract_value).toLocaleString()} บาท`} />}
                {detail.project.budget && <InfoRow icon={DollarSign} label="งบประมาณ" value={`${Number(detail.project.budget).toLocaleString()} บาท`} />}
              </div>
            </section>
          )}

          {/* สเปคเทคนิค */}
          {detail.project.specs && (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Cpu size={18} className="text-purple-600" /> สเปคเทคนิค
              </h2>
              <div className="space-y-3">
                {detail.project.specs.panel_brand && <InfoRow icon={Zap} label="แผง" value={`${detail.project.specs.panel_brand} ${detail.project.specs.panel_model || ''} (${detail.project.specs.panel_count || '-'} แผง)`} />}
                {detail.project.specs.inverter_brand && <InfoRow icon={Zap} label="อินเวอร์เตอร์" value={`${detail.project.specs.inverter_brand} ${detail.project.specs.inverter_model || ''} (${detail.project.specs.inverter_count || '-'} เครื่อง)`} />}
                {detail.project.specs.mounting_type && <InfoRow icon={Building2} label="ประเภทติดตั้ง" value={MOUNTING_TYPES[detail.project.specs.mounting_type] || detail.project.specs.mounting_type} />}
                {detail.project.specs.grid_connection_type && <InfoRow icon={Zap} label="การต่อเชื่อม" value={detail.project.specs.grid_connection_type} />}
              </div>
            </section>
          )}

          {/* ผู้รับผิดชอบ */}
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">ผู้รับผิดชอบ</h2>
              <button
                onClick={() => detail.setShowUserPicker(!detail.showUserPicker)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                {detail.showUserPicker ? <X size={14} /> : <Plus size={14} />}
                {detail.showUserPicker ? 'ยกเลิก' : 'เปลี่ยน'}
              </button>
            </div>

            {/* แสดงผู้รับผิดชอบปัจจุบัน */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <User size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {detail.project.responsible_user_name || 'ยังไม่ได้กำหนด'}
                </p>
                <p className="text-xs text-slate-500">ผู้รับผิดชอบโครงการ</p>
              </div>
            </div>

            {/* Dropdown เลือกผู้ใช้ */}
            {detail.showUserPicker && (
              <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                <button
                  onClick={() => detail.handleChangeUser(null)}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-500 hover:bg-slate-50 border-b border-slate-100"
                >
                  -- ไม่กำหนด --
                </button>
                {detail.allUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => detail.handleChangeUser(user.id)}
                    disabled={detail.savingUser}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-3"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {(user.full_name || user.username).charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{user.full_name || user.username}</p>
                      <p className="text-xs text-slate-400">{user.role === 'admin' ? 'Admin' : 'Engineer'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* หน่วยงานที่เกี่ยวข้อง */}
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">หน่วยงานที่เกี่ยวข้อง</h2>
              <button
                onClick={detail.loadOrgsList}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <Plus size={14} />
                เพิ่มหน่วยงาน
              </button>
            </div>

            {/* แสดงหน่วยงานที่เชื่อมแล้ว */}
            {detail.projectOrgs.length === 0 ? (
              <p className="text-sm text-slate-400 py-3">ยังไม่ได้เชื่อมหน่วยงาน</p>
            ) : (
              <div className="space-y-2">
                {detail.projectOrgs.map(org => (
                  <div key={org.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{org.org_name}</p>
                        <p className="text-xs text-slate-500">{org.org_type}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => detail.handleRemoveOrg(org.id)}
                      className="rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      title="ลบ"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Dropdown เลือกหน่วยงาน */}
            {detail.showOrgPicker && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 mb-2">เลือกหน่วยงานที่ต้องการเพิ่ม:</p>
                {availableOrgs.length === 0 ? (
                  <p className="text-sm text-slate-400 py-2">เชื่อมครบทุกหน่วยงานแล้ว</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                    {availableOrgs.map(org => (
                      <button
                        key={org.id}
                        onClick={() => detail.handleAddOrg(org.id)}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-3"
                      >
                        <Building2 size={14} className="text-slate-400" />
                        <span>{org.org_name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => detail.setShowOrgPicker(false)}
                  className="mt-2 text-xs text-slate-500 hover:text-slate-700"
                >
                  ปิด
                </button>
              </div>
            )}
          </section>
        </div>

        {/* ขวา: Pipeline + Timeline */}
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-5">ความคืบหน้า</h2>

          {/* Step Progress Bar */}
          <div className="grid grid-cols-7 gap-2 mb-6">
            {stepOrder.map((step, index) => {
              const meta = stepMeta[step];
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const scopeStartIdx = stepOrder.indexOf(detail.project.scope_start || 'survey');
              const scopeEndIdx = stepOrder.indexOf(detail.project.scope_end || 'cod');
              const inScope = index >= scopeStartIdx && index <= scopeEndIdx;
              const isSelected = cpHooks.selectedStep === step;
              const stepCheckpoints = cpHooks.checkpoints.filter(cp => cp.step === step);
              const passedCount = stepCheckpoints.filter(c => c.status === 'passed').length;

              return (
                <div
                  key={step}
                  onClick={() => cpHooks.handleStepClick(step)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl cursor-pointer transition-all select-none ${
                    isSelected ? 'bg-blue-50 ring-2 ring-blue-400 shadow-sm' :
                    'hover:bg-slate-100 active:bg-slate-200'
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') cpHooks.handleStepClick(step); }}
                >
                  <div className={`w-full h-3 rounded-full transition-all duration-300 ${
                    !inScope ? 'bg-slate-100 border-2 border-dashed border-slate-300' :
                    isSelected ? `${meta.color} ring-4 ring-blue-200` :
                    isCompleted ? meta.color :
                    isCurrent ? `${meta.color} ring-4 ${meta.ring}` :
                    'bg-slate-200'
                  }`} />
                  <div className="flex flex-col items-center">
                    <span className={`text-xs font-semibold ${
                      !inScope ? 'text-slate-300' :
                      isSelected ? 'text-blue-700' :
                      isCurrent ? meta.text : 'text-slate-500'
                    }`}>
                      {STEP_LABELS[step]}
                    </span>
                    {stepCheckpoints.length > 0 && (
                      <span className={`text-[10px] font-medium mt-0.5 ${
                        isSelected ? 'text-blue-600' : 'text-slate-400'
                      }`}>
                        {passedCount}/{stepCheckpoints.length}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checkpoints Section */}
          {cpHooks.selectedStep && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    จุดตรวจสอบ: {STEP_LABELS[cpHooks.selectedStep]}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {cpHooks.checkpoints.filter(c => c.step === cpHooks.selectedStep).length} รายการ
                  </p>
                </div>
                <button
                  onClick={() => cpHooks.setShowCpForm(!cpHooks.showCpForm)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  {cpHooks.showCpForm ? <X size={14} /> : <Plus size={14} />}
                  {cpHooks.showCpForm ? 'ยกเลิก' : 'เพิ่ม'}
                </button>
              </div>

              {/* Checkpoint Form */}
              {cpHooks.showCpForm && (
                <div className="mb-4 rounded-xl border border-blue-200 bg-white p-3">
                  <input
                    type="text"
                    value={cpHooks.cpForm.checkpoint_name}
                    onChange={(e) => cpHooks.setCpForm(prev => ({ ...prev, checkpoint_name: e.target.value }))}
                    placeholder="ชื่อจุดตรวจสอบ (เช่น ยื่น COP)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mb-2 focus:border-blue-400 outline-none"
                  />
                  <textarea
                    value={cpHooks.cpForm.notes}
                    onChange={(e) => cpHooks.setCpForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="หมายเหตุ (ถ้ามี)"
                    rows="2"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mb-2 focus:border-blue-400 outline-none"
                  />
                  <label className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={cpHooks.cpForm.required}
                      onChange={(e) => cpHooks.setCpForm(prev => ({ ...prev, required: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-xs text-slate-600">จำเป็นต้องผ่าน</span>
                  </label>
                  <button
                    onClick={cpHooks.handleCreateCheckpoint}
                    disabled={!cpHooks.cpForm.checkpoint_name.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >
                    บันทึก
                  </button>
                </div>
              )}

              {/* Checkpoint List */}
              {cpHooks.checkpoints.filter(c => c.step === cpHooks.selectedStep).length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">ยังไม่มีจุดตรวจสอบในขั้นตอนนี้</p>
              ) : (
                <div className="space-y-2">
                  {cpHooks.checkpoints.filter(c => c.step === cpHooks.selectedStep).map((cp) => (
                    <div key={cp.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-900">{cp.checkpoint_name}</span>
                            {cp.required ? (
                              <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-medium">จำเป็น</span>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">ไม่บังคับ</span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              cp.status === 'passed' ? 'bg-emerald-50 text-emerald-700' :
                              cp.status === 'failed' ? 'bg-red-50 text-red-700' :
                              cp.status === 'skipped' ? 'bg-slate-100 text-slate-500' :
                              'bg-amber-50 text-amber-700'
                            }`}>
                              {cp.status === 'passed' ? 'ผ่าน' :
                               cp.status === 'failed' ? 'ไม่ผ่าน' :
                               cp.status === 'skipped' ? 'ข้าม' : 'รอดำเนินการ'}
                            </span>
                          </div>
                          {cp.assigned_to_name && (
                            <p className="text-xs text-slate-500 mt-1">ผู้รับผิดชอบ: {cp.assigned_to_name}</p>
                          )}
                          {cpHooks.editingCp === cp.id ? (
                            <div className="mt-2 flex gap-2">
                              <input
                                type="text"
                                defaultValue={cp.notes || ''}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') cpHooks.handleUpdateCheckpointNotes(cp.id, e.target.value);
                                  if (e.key === 'Escape') cpHooks.setEditingCp(null);
                                }}
                                className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-blue-400 outline-none"
                                autoFocus
                              />
                              <button onClick={() => cpHooks.setEditingCp(null)} className="text-xs text-slate-400 hover:text-slate-600">ยกเลิก</button>
                            </div>
                          ) : cp.notes ? (
                            <p className="text-xs text-slate-600 mt-1 cursor-pointer hover:text-blue-600" onClick={() => cpHooks.setEditingCp(cp.id)}>
                              {cp.notes}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {cp.status === 'pending' && (
                            <>
                              <button
                                onClick={() => cpHooks.handleApproveCheckpoint(cp.id)}
                                className="rounded-full p-1.5 text-emerald-500 hover:bg-emerald-50 transition-colors"
                                title="อนุมัติ"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => cpHooks.handleUpdateCheckpointStatus(cp.id, 'failed')}
                                className="rounded-full p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                                title="ไม่ผ่าน"
                              >
                                <X size={14} />
                              </button>
                              <button
                                onClick={() => cpHooks.handleUpdateCheckpointStatus(cp.id, 'skipped')}
                                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 transition-colors"
                                title="ข้าม"
                              >
                                <Minus size={14} />
                              </button>
                            </>
                          )}
                          {cp.status === 'failed' && (
                            <button
                              onClick={() => cpHooks.handleUpdateCheckpointStatus(cp.id, 'pending')}
                              className="rounded-full p-1.5 text-amber-500 hover:bg-amber-50 transition-colors"
                              title="รีเซ็ต"
                            >
                              <RefreshCw size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => cpHooks.handleDeleteCheckpoint(cp.id)}
                            className="rounded-full p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="ลบ"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          <h3 className="text-lg font-bold text-slate-900 mb-4">Timeline</h3>

          {detail.timeline.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">ยังไม่มีประวัติการเปลี่ยนแปลง</p>
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-3 bottom-3 w-0.5 bg-slate-200" />

              <div className="space-y-6">
                {detail.timeline.map((entry) => {
                  const isCheckpoint = entry.status?.startsWith('checkpoint_');
                  const meta = stepMeta[entry.step] || { color: 'bg-slate-500', text: 'text-slate-600' };

                  const checkpointIcon = {
                    checkpoint_created: <Plus size={14} />,
                    checkpoint_passed: <Check size={14} />,
                    checkpoint_failed: <X size={14} />,
                    checkpoint_skipped: <Minus size={14} />,
                  };

                  const checkpointColors = {
                    checkpoint_created: 'bg-cyan-500',
                    checkpoint_passed: 'bg-emerald-500',
                    checkpoint_failed: 'bg-rose-500',
                    checkpoint_skipped: 'bg-amber-500',
                  };

                  return (
                    <div key={entry.id} className="relative flex items-start gap-4 pl-2">
                      <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isCheckpoint ? checkpointColors[entry.status] || 'bg-slate-400' : meta.color} text-white text-xs font-bold`}>
                        {isCheckpoint ? (checkpointIcon[entry.status] || '?') : (STEP_LABELS[entry.step]?.charAt(0) || '?')}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">
                            {isCheckpoint ? entry.note?.match(/\[จุดตรวจสอบ\]\s*(.+?):/)?.[1] || 'จุดตรวจสอบ' : STEP_LABELS[entry.step]}
                          </span>
                          {isCheckpoint && (
                            <span className="text-[10px] text-slate-400">
                              ({STEP_LABELS[entry.step]})
                            </span>
                          )}
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[entry.status] || 'bg-slate-100 text-slate-600'}`}>
                            {STATUS_LABELS[entry.status] || entry.status}
                          </span>
                          <button
                            onClick={() => toggleComments(entry.id)}
                            className={`relative rounded-full p-1.5 transition-colors ${
                              expandedComments[entry.id]
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                            }`}
                            title="คอมเมนต์"
                          >
                            <MessageSquare size={14} />
                            {entry.comment_count > 0 && (
                              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
                                {entry.comment_count > 99 ? '99+' : entry.comment_count}
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => detail.handleDeleteTimeline(entry.id)}
                            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            title="ลบรายการนี้"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <Clock size={12} />
                          <span>{formatDateTime(entry.created_at)}</span>
                          {entry.changed_by_name && (
                            <>
                              <span className="text-slate-300">|</span>
                              <User size={12} />
                              <span>{entry.changed_by_name}</span>
                            </>
                          )}
                        </div>

                        {entry.note && (
                          <p className="mt-1 text-sm text-slate-600">{entry.note}</p>
                        )}

                        {/* Comment Section */}
                        {expandedComments[entry.id] && (
                          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            {/* รายการคอมเมนต์ */}
                            {(commentsMap[entry.id] || []).length === 0 ? (
                              <p className="text-xs text-slate-400 py-1">ยังไม่มีคอมเมนต์</p>
                            ) : (
                              <div className="space-y-2 mb-3">
                                {(commentsMap[entry.id] || []).map((c) => (
                                  <div key={c.id} className="flex items-start gap-2">
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold mt-0.5">
                                      {(c.user_name || c.username || '?').charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-slate-800">{c.user_name || c.username || 'ไม่ทราบ'}</span>
                                        <span className="text-[10px] text-slate-400">{formatDateTime(c.created_at)}</span>
                                        <button
                                          onClick={() => handleDeleteComment(entry.id, c.id)}
                                          className="ml-auto rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                          title="ลบ"
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                      <p className="text-xs text-slate-700 mt-0.5 whitespace-pre-wrap">{c.comment}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* ช่องเพิ่มคอมเมนต์ */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={commentTexts[entry.id] || ''}
                                onChange={(e) => setCommentTexts((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(entry.id); }}
                                placeholder="เพิ่มคอมเมนต์..."
                                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400"
                              />
                              <button
                                onClick={() => handleAddComment(entry.id)}
                                disabled={submittingComment || !(commentTexts[entry.id] || '').trim()}
                                className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
                              >
                                <Send size={12} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}

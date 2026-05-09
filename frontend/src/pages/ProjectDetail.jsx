import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Calendar, MapPin, Zap, FileText, Clock,
  Loader, User, Building2, AlertTriangle, Trash2, Plus, X, Save
} from 'lucide-react';
import { projectsAPI, usersAPI, organizationsAPI } from '../utils/api';
import {
  STATUS_LABELS, STATUS_COLORS, STEP_LABELS,
  PERMIT_TYPES
} from '../utils/constants';

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
  const [project, setProject] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  // สำหรับจัดการหน่วยงาน
  const [allOrgs, setAllOrgs] = useState([]);
  const [projectOrgs, setProjectOrgs] = useState([]);
  const [showOrgPicker, setShowOrgPicker] = useState(false);

  // สำหรับจัดการผู้รับผิดชอบ
  const [allUsers, setAllUsers] = useState([]);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  const requestIdRef = useRef(0);

  useEffect(() => {
    const currentId = ++requestIdRef.current;
    loadAll(currentId);
  }, [id]);

  const loadAll = async (reqId) => {
    try {
      setLoading(true);
      const [proj, tl, orgs, usersResult] = await Promise.all([
        projectsAPI.getById(id),
        projectsAPI.getTimeline(id),
        projectsAPI.getOrganizations(id),
        usersAPI.getAll()
      ]);
      if (reqId !== requestIdRef.current) return;
      setProject(proj);
      setTimeline(tl);
      setProjectOrgs(Array.isArray(orgs) ? orgs : (orgs.data || []));
      setAllUsers(Array.isArray(usersResult) ? usersResult : (usersResult.data || []));
    } catch (error) {
      if (reqId === requestIdRef.current) console.error('Failed to load:', error);
    } finally {
      if (reqId === requestIdRef.current) setLoading(false);
    }
  };

  // โหลด organizations list เมื่อกดปุ่มเพิ่ม
  const loadOrgsList = async () => {
    try {
      const orgsResult = await organizationsAPI.getAll();
      setAllOrgs(Array.isArray(orgsResult) ? orgsResult : (orgsResult.data || []));
      setShowOrgPicker(true);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  // เพิ่มหน่วยงานให้โครงการ
  const handleAddOrg = async (orgId) => {
    try {
      await projectsAPI.addOrganization(id, orgId);
      const orgs = await projectsAPI.getOrganizations(id);
      setProjectOrgs(Array.isArray(orgs) ? orgs : (orgs.data || []));
      setShowOrgPicker(false);
    } catch (error) {
      console.error('Failed to add organization:', error);
    }
  };

  // ลบหน่วยงานจากโครงการ
  const handleRemoveOrg = async (orgId) => {
    if (!window.confirm('ต้องการลบหน่วยงานนี้ออกจากโครงการหรือไม่?')) return;
    try {
      await projectsAPI.removeOrganization(id, orgId);
      const orgs = await projectsAPI.getOrganizations(id);
      setProjectOrgs(Array.isArray(orgs) ? orgs : (orgs.data || []));
    } catch (error) {
      console.error('Failed to remove organization:', error);
    }
  };

  // เปลี่ยนผู้รับผิดชอบ
  const handleChangeUser = async (userId) => {
    try {
      setSavingUser(true);
      await projectsAPI.update(id, { responsible_user: userId || null });
      const proj = await projectsAPI.getById(id);
      setProject(proj);
      setShowUserPicker(false);
    } catch (error) {
      console.error('Failed to update responsible user:', error);
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteTimeline = async (timelineId) => {
    if (!window.confirm('ต้องการลบรายการ timeline นี้หรือไม่?')) return;
    try {
      await projectsAPI.deleteTimeline(id, timelineId);
      const tl = await projectsAPI.getTimeline(id);
      setTimeline(Array.isArray(tl) ? tl : (tl.data || []));
    } catch (error) {
      console.error('Failed to delete timeline:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader size={24} className="animate-spin mr-3" />
        กำลังโหลด...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p className="text-lg">ไม่พบโครงการ</p>
        <button onClick={() => navigate('/projects')} className="mt-4 text-blue-600 hover:underline">
          กลับไปหน้าโครงการ
        </button>
      </div>
    );
  }

  const currentStepIndex = stepOrder.indexOf(project.current_step);
  // หน่วยงานที่ยังไม่ได้เชื่อม
  const availableOrgs = allOrgs.filter(o => !projectOrgs.some(po => po.id === o.id));

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
              <p className="text-sm text-slate-500">{project.project_code}</p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{project.project_name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  stepMeta[project.current_step]?.color || 'bg-slate-500'
                } text-white`}>
                  {STEP_LABELS[project.current_step]}
                </span>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[project.status]}`}>
                  {STATUS_LABELS[project.status]}
                </span>
                {project.permit_type && (
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    project.permit_type === 'exemption' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {PERMIT_TYPES[project.permit_type]}
                  </span>
                )}
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
              <InfoRow icon={Zap} label="ขนาด" value={`${project.size_kw} kW / ${project.size_kva || '-'} kVA`} />
              <InfoRow icon={MapPin} label="จังหวัด" value={project.province} />
              <InfoRow icon={Calendar} label="วันที่เริ่ม" value={formatDate(project.start_date)} />
              <InfoRow icon={Calendar} label="วันที่คาดว่าจะ COD" value={formatDate(project.expected_cod_date)} />
              <InfoRow icon={Calendar} label="วันที่ COD จริง" value={formatDate(project.actual_cod_date)} />
              <InfoRow icon={FileText} label="ขายไฟ" value={project.has_power_selling ? 'มี' : 'ไม่มี'} />
              {project.blocked_reason && (
                <InfoRow icon={AlertTriangle} label="เหตุผลที่ติดปัญหา" value={project.blocked_reason} />
              )}
              {project.description && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">รายละเอียด</p>
                  <p className="text-sm text-slate-700">{project.description}</p>
                </div>
              )}
            </div>
          </section>

          {/* ผู้รับผิดชอบ */}
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">ผู้รับผิดชอบ</h2>
              <button
                onClick={() => setShowUserPicker(!showUserPicker)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                {showUserPicker ? <X size={14} /> : <Plus size={14} />}
                {showUserPicker ? 'ยกเลิก' : 'เปลี่ยน'}
              </button>
            </div>

            {/* แสดงผู้รับผิดชอบปัจจุบัน */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <User size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {project.responsible_user_name || 'ยังไม่ได้กำหนด'}
                </p>
                <p className="text-xs text-slate-500">ผู้รับผิดชอบโครงการ</p>
              </div>
            </div>

            {/* Dropdown เลือกผู้ใช้ */}
            {showUserPicker && (
              <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                <button
                  onClick={() => handleChangeUser(null)}
                  className="w-full px-4 py-2.5 text-left text-sm text-slate-500 hover:bg-slate-50 border-b border-slate-100"
                >
                  -- ไม่กำหนด --
                </button>
                {allUsers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleChangeUser(user.id)}
                    disabled={savingUser}
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
                onClick={loadOrgsList}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                <Plus size={14} />
                เพิ่มหน่วยงาน
              </button>
            </div>

            {/* แสดงหน่วยงานที่เชื่อมแล้ว */}
            {projectOrgs.length === 0 ? (
              <p className="text-sm text-slate-400 py-3">ยังไม่ได้เชื่อมหน่วยงาน</p>
            ) : (
              <div className="space-y-2">
                {projectOrgs.map(org => (
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
                      onClick={() => handleRemoveOrg(org.id)}
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
            {showOrgPicker && (
              <div className="mt-3">
                <p className="text-xs text-slate-500 mb-2">เลือกหน่วยงานที่ต้องการเพิ่ม:</p>
                {availableOrgs.length === 0 ? (
                  <p className="text-sm text-slate-400 py-2">เชื่อมครบทุกหน่วยงานแล้ว</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                    {availableOrgs.map(org => (
                      <button
                        key={org.id}
                        onClick={() => handleAddOrg(org.id)}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-3"
                      >
                        <Building2 size={14} className="text-slate-400" />
                        <span>{org.org_name}</span>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowOrgPicker(false)}
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
          <div className="flex items-center gap-1 mb-8">
            {stepOrder.map((step, index) => {
              const meta = stepMeta[step];
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div key={step} className="flex-1 flex flex-col items-center gap-2">
                  <div className={`w-full h-3 rounded-full transition-all duration-500 ${
                    isCompleted ? meta.color :
                    isCurrent ? `${meta.color} ring-4 ${meta.ring}` :
                    'bg-slate-200'
                  }`} />
                  <span className={`text-[10px] font-medium ${isCurrent ? meta.text : 'text-slate-400'}`}>
                    {STEP_LABELS[step]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Timeline */}
          <h3 className="text-lg font-bold text-slate-900 mb-4">Timeline</h3>

          {timeline.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">ยังไม่มีประวัติการเปลี่ยนแปลง</p>
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-3 bottom-3 w-0.5 bg-slate-200" />

              <div className="space-y-6">
                {timeline.map((entry) => {
                  const meta = stepMeta[entry.step] || { color: 'bg-slate-500', text: 'text-slate-600' };

                  return (
                    <div key={entry.id} className="relative flex items-start gap-4 pl-2">
                      <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.color} text-white text-xs font-bold`}>
                        {STEP_LABELS[entry.step]?.charAt(0) || '?'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">
                            {STEP_LABELS[entry.step]}
                          </span>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[entry.status] || 'bg-slate-100 text-slate-600'}`}>
                            {STATUS_LABELS[entry.status] || entry.status}
                          </span>
                          <button
                            onClick={() => handleDeleteTimeline(entry.id)}
                            className="ml-auto rounded-full p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
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

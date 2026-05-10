import { CalendarDays, ChevronDown, Menu, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import KPICards from '../components/KPICards';
import Pipeline from '../components/Pipeline';
import ProjectsTable from '../components/ProjectsTable';
import ProjectModal from '../components/ProjectModal';
import { PROVINCES, STATUS_LABELS, STEP_LABELS } from '../utils/constants';

const todayLabel = new Date().toLocaleString('th-TH', {
  dateStyle: 'long',
  timeStyle: 'short'
});

export default function Dashboard() {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    current_step: '',
    province: ''
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const tableFilters = useMemo(() => {
    const normalized = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        normalized[key] = value;
      }
    });

    return normalized;
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCreateProject = () => {
    setSelectedProject(null);
    setIsModalOpen(true);
  };

  const handleEditProject = (project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  // เมื่อบันทึกโครงการใหม่หรือแก้ไข → refresh ตาราง
  const handleProjectSaved = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // เมื่ออัปเดตสถานะสำเร็จ → refresh ตาราง + KPI cards
  const handleStatusUpdated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6 bg-slate-50/80">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Menu size={22} />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">ภาพรวมโครงการ</h1>
              <p className="mt-2 text-base text-slate-500">
                แดชบอร์ดสถานะโครงการผลิตไฟฟ้าจากพลังงานแสงอาทิตย์ของนายไตรทศเกิด
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <CalendarDays size={18} className="text-slate-400" />
            <span>{todayLabel} น.</span>
          </div>
        </div>
      </section>

      {/* ส่ง refreshKey เพื่อให้ KPICards และ Pipeline ดึงข้อมูลใหม่หลังอัปเดตสถานะโครงการ */}
      <KPICards refreshKey={refreshKey} />

      <Pipeline refreshKey={refreshKey} />

      <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-sm">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="ค้นหาโครงการ..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
            />
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="relative">
                <select
                  value={filters.current_step}
                  onChange={(e) => handleFilterChange('current_step', e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  <option value="">ขั้นตอนปัจจุบัน</option>
                  <option value="survey">{STEP_LABELS.survey}</option>
                  <option value="design">{STEP_LABELS.design}</option>
                  <option value="erc">{STEP_LABELS.erc}</option>
                  <option value="grid">{STEP_LABELS.grid}</option>
                  <option value="construction">{STEP_LABELS.construction}</option>
                  <option value="testing">{STEP_LABELS.testing}</option>
                  <option value="cod">{STEP_LABELS.cod}</option>
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </label>

              <label className="relative">
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  <option value="">สถานะ</option>
                  <option value="not_started">{STATUS_LABELS.not_started}</option>
                  <option value="in_progress">{STATUS_LABELS.in_progress}</option>
                  <option value="waiting">{STATUS_LABELS.waiting}</option>
                  <option value="blocked">{STATUS_LABELS.blocked}</option>
                  <option value="rejected">{STATUS_LABELS.rejected}</option>
                  <option value="completed">{STATUS_LABELS.completed}</option>
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </label>

              <label className="relative">
                <select
                  value={filters.province}
                  onChange={(e) => handleFilterChange('province', e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                >
                  <option value="">จังหวัด</option>
                  {PROVINCES.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </label>
            </div>

            <button
              onClick={handleCreateProject}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={18} />
              เพิ่มโครงการใหม่
            </button>
          </div>
        </div>

        <ProjectsTable
          filters={tableFilters}
          refreshKey={refreshKey}
          onEditProject={handleEditProject}
          onStatusUpdated={handleStatusUpdated}
        />
      </section>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProjectCreated={handleProjectSaved}
        project={selectedProject}
      />
    </div>
  );
}

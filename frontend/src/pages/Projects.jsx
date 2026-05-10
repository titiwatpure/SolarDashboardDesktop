import { Briefcase, ChevronDown, FolderSearch, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import ProjectsTable from '../components/ProjectsTable';
import ProjectModal from '../components/ProjectModal';
import { PROVINCES, STATUS_LABELS, STEP_LABELS } from '../utils/constants';

export default function Projects() {
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

  // เมื่ออัปเดตสถานะสำเร็จ → refresh ตาราง
  const handleStatusUpdated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Briefcase size={22} />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">โครงการทั้งหมด</h1>
              <p className="mt-2 max-w-2xl text-base text-slate-500">
                จัดการ ค้นหา และติดตามความคืบหน้าของโครงการทั้งหมดในระบบจากมุมมองเดียว
              </p>
            </div>
          </div>

          <button
            onClick={handleCreateProject}
            className="inline-flex items-center justify-center gap-2 self-start rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus size={18} />
            เพิ่มโครงการใหม่
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[1.3fr_2fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                <FolderSearch size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">ค้นหาและกรองข้อมูล</h2>
                <p className="text-sm text-slate-500">ค้นหาโครงการจากชื่อ รหัส จังหวัด สถานะ และขั้นตอนงาน</p>
              </div>
            </div>

            <div className="relative mt-5">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="ค้นหาจากชื่อโครงการหรือรหัสโครงการ..."
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-blue-400"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <SlidersHorizontal size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">ตัวกรองโครงการ</h2>
                <p className="text-sm text-slate-500">ปรับมุมมองรายการโครงการให้ตรงกับข้อมูลที่ต้องการ</p>
              </div>
            </div>

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
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">รายการโครงการ</h2>
            <p className="mt-1 text-sm text-slate-500">จัดการและติดตามรายการโครงการทั้งหมดจากตารางด้านล่าง</p>
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
        onProjectCreated={() => setRefreshKey((prev) => prev + 1)}
        project={selectedProject}
      />
    </div>
  );
}

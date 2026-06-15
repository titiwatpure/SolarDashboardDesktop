import { ChevronLeft, ChevronRight, Clock, AlertTriangle, Edit2, ExternalLink, X, Star, Search, ChevronDown, Filter, CalendarDays } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksAPI, projectsAPI, usersAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { PRIORITY_LABELS } from '../utils/constants';

const PRIORITY_COLORS = { urgent: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-400', low: 'bg-slate-300' };
const TASK_STATUS_LABELS = { pending: 'รอดำเนินการ', in_progress: 'กำลังดำเนินการ', completed: 'เสร็จแล้ว', cancelled: 'ยกเลิก' };
const TASK_STATUS_COLORS = { pending: 'bg-slate-100 text-slate-700', in_progress: 'bg-blue-100 text-blue-700', completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-700' };
const EVENT_BG = {
  overdue: 'bg-red-50 border-red-200 text-red-800',
  in_progress: 'bg-blue-50 border-blue-200 text-blue-800',
  completed: 'bg-emerald-50 border-emerald-200 text-emerald-700 line-through opacity-60',
  pending: 'bg-slate-50 border-slate-200 text-slate-700',
};
const DAYS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTHS_TH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const VIEW_MODES = [
  { key: 'day', label: 'วัน' },
  { key: 'week', label: 'สัปดาห์' },
  { key: 'month', label: 'เดือน' },
  { key: 'year', label: 'ปี' },
];

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y, m) { return new Date(y, m, 1).getDay(); }
function isSameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isToday(d) { return isSameDay(d, new Date()); }
function toKey(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
function getWeekStart(date) { const d = new Date(date); d.setDate(d.getDate() - d.getDay()); return d; }
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }

function getEventStyle(t, isOverdueFn) {
  if (t.status === 'completed' || t.status === 'cancelled') return EVENT_BG.completed;
  if (isOverdueFn(t.due_date, t.status)) return EVENT_BG.overdue;
  if (t.status === 'in_progress') return EVENT_BG.in_progress;
  return EVENT_BG.pending;
}

function TaskChip({ task, onClick, isOverdueFn, isMyTaskFn }) {
  const bg = getEventStyle(task, isOverdueFn);
  const myTask = isMyTaskFn(task);
  return (
    <button onClick={onClick} className={`w-full text-left rounded border px-2.5 py-2 text-xs leading-tight transition-all hover:shadow-sm ${bg}`}>
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] || 'bg-slate-300'}`} />
        <span className="truncate font-medium">{task.title}</span>
        {myTask && <Star size={10} className="shrink-0 text-amber-500 fill-amber-500" />}
      </div>
      {task.project_name && <p className="mt-0.5 pl-3.5 text-[10px] opacity-60 truncate">{task.project_name}</p>}
    </button>
  );
}

function TaskListCard({ task, onClick, isOverdueFn, isMyTaskFn }) {
  const bg = getEventStyle(task, isOverdueFn);
  const myTask = isMyTaskFn(task);
  const overdue = task.due_date && isOverdueFn(task.due_date, task.status);
  return (
    <button onClick={onClick} className={`w-full text-left rounded-xl border px-4 py-3 transition-all hover:shadow-sm ${bg}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] || 'bg-slate-300'}`} />
            <span className="font-medium text-sm truncate">{task.title}</span>
            {myTask && <Star size={11} className="shrink-0 text-amber-500 fill-amber-500" />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] opacity-70">
            {task.project_name && <span>{task.project_name}</span>}
            {task.assigned_to_name && <span>· {task.assigned_to_name}</span>}
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TASK_STATUS_COLORS[task.status] || ''}`}>
              {TASK_STATUS_LABELS[task.status] || task.status}
            </span>
          </div>
        </div>
        {overdue && (
          <span className="shrink-0 inline-flex items-center gap-0.5 rounded-lg bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
            <AlertTriangle size={10} />เกินกำหนด
          </span>
        )}
      </div>
    </button>
  );
}

export default function TaskCalendar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [showUnscheduled, setShowUnscheduled] = useState(true);
  const [expandedDays, setExpandedDays] = useState({});
  const [viewMode, setViewMode] = useState('month');
  const [filterProject, setFilterProject] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes, usersRes] = await Promise.all([
        tasksAPI.getAll({ limit: 500 }),
        projectsAPI.getAll({ limit: 100 }),
        usersAPI.getAll({ limit: 100 }),
      ]);
      setTasks(tasksRes.data || []);
      setProjects(Array.isArray(projectsRes) ? projectsRes : projectsRes?.data || []);
      setUsers(Array.isArray(usersRes) ? usersRes : usersRes?.data || []);
    } catch (err) { console.error('Failed to load calendar data:', err); }
    finally { setLoading(false); }
  };

  const isOverdue = (dueDate, status) => {
    if (status === 'completed' || status === 'cancelled') return false;
    return new Date(dueDate) < today && !isSameDay(new Date(dueDate), today);
  };
  const isMyTask = (t) => t.assigned_to === user?.id;

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!showCompleted && t.status === 'completed') return false;
      if (filterProject && t.project_id !== filterProject) return false;
      if (filterAssignee && t.assigned_to !== filterAssignee) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!(t.title || '').toLowerCase().includes(q) && !(t.project_name || '').toLowerCase().includes(q) && !(t.assigned_to_name || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tasks, showCompleted, filterProject, filterAssignee, filterStatus, filterPriority, searchQuery]);

  const tasksWithDueDate = useMemo(() => filteredTasks.filter(t => t.due_date), [filteredTasks]);
  const tasksWithoutDueDate = useMemo(() => filteredTasks.filter(t => !t.due_date), [filteredTasks]);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasksWithDueDate.forEach(t => { const d = t.due_date.split('T')[0]; if (!map[d]) map[d] = []; map[d].push(t); });
    return map;
  }, [tasksWithDueDate]);

  const clearFilters = () => { setFilterProject(''); setFilterAssignee(''); setFilterStatus(''); setFilterPriority(''); setSearchQuery(''); };
  const hasActiveFilter = filterProject || filterAssignee || filterStatus || filterPriority || searchQuery;
  const openTask = (task) => setSelectedTask(task);
  const closeModal = () => setSelectedTask(null);

  const navPrev = () => {
    if (viewMode === 'day') setCurrentDate(d => addDays(d, -1));
    else if (viewMode === 'week') setCurrentDate(d => addDays(d, -7));
    else if (viewMode === 'month') setCurrentDate(new Date(year, month - 1, 1));
    else setCurrentDate(new Date(year - 1, month, 1));
  };
  const navNext = () => {
    if (viewMode === 'day') setCurrentDate(d => addDays(d, 1));
    else if (viewMode === 'week') setCurrentDate(d => addDays(d, 7));
    else if (viewMode === 'month') setCurrentDate(new Date(year, month + 1, 1));
    else setCurrentDate(new Date(year + 1, month, 1));
  };
  const goToToday = () => setCurrentDate(new Date());

  const getNavLabel = () => {
    if (viewMode === 'day') return `${currentDate.getDate()} ${MONTHS_TH[currentDate.getMonth()]} ${currentDate.getFullYear() + 543}`;
    if (viewMode === 'week') {
      const ws = getWeekStart(currentDate);
      const we = addDays(ws, 6);
      return `${ws.getDate()} ${MONTHS_TH[ws.getMonth()].slice(0, 3)} - ${we.getDate()} ${MONTHS_TH[we.getMonth()].slice(0, 3)} ${we.getFullYear() + 543}`;
    }
    if (viewMode === 'month') return `${MONTHS_TH[month]} ${year + 543}`;
    return `ปี ${year + 543}`;
  };

  const getTasksForDay = (date) => {
    const dk = toKey(date.getFullYear(), date.getMonth(), date.getDate());
    return tasksByDate[dk] || [];
  };

  const toggleExpandDay = (key) => setExpandedDays(p => ({ ...p, [key]: !p[key] }));
  const MAX_VISIBLE = 3;

  // ===== DAY VIEW =====
  const renderDayView = () => {
    const dayTasks = getTasksForDay(currentDate);
    const todayFlag = isToday(currentDate);
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className={`px-5 py-4 border-b border-slate-100 ${todayFlag ? 'bg-blue-50' : ''}`}>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center justify-center w-12 h-12 text-lg font-bold rounded-2xl ${todayFlag ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {currentDate.getDate()}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">{DAYS_TH[currentDate.getDay()]}</p>
              <p className="text-xs text-slate-500">{MONTHS_TH[currentDate.getMonth()]} {currentDate.getFullYear() + 543}</p>
            </div>
            {dayTasks.length > 0 && (
              <span className="ml-auto text-sm font-bold text-slate-700">{dayTasks.length} งาน</span>
            )}
          </div>
        </div>
        <div className="p-4 space-y-2">
          {dayTasks.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-8">ไม่มีงานในวันนี้</p>
          ) : dayTasks.map(t => <TaskListCard key={t.id} task={t} onClick={() => openTask(t)} isOverdueFn={isOverdue} isMyTaskFn={isMyTask} />)}
        </div>
      </div>
    );
  };

  // ===== WEEK VIEW =====
  const renderWeekView = () => {
    const ws = getWeekStart(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200">
          {days.map((d, i) => {
            const tf = isToday(d);
            return (
              <div key={i} className={`py-2.5 text-center border-r border-slate-100 last:border-r-0 ${tf ? 'bg-blue-50' : 'bg-slate-50'}`}>
                <p className={`text-[10px] font-medium ${tf ? 'text-blue-600' : 'text-slate-400'}`}>{DAYS_TH[d.getDay()]}</p>
                <p className={`inline-flex items-center justify-center w-7 h-7 mt-0.5 text-sm font-bold rounded-full ${tf ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>{d.getDate()}</p>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-7 min-h-[200px]">
          {days.map((d, i) => {
            const dayTasks = getTasksForDay(d);
            return (
              <div key={i} className="border-r border-slate-100 last:border-r-0 p-1.5 space-y-1">
                {dayTasks.slice(0, 4).map(t => {
                  const bg = getEventStyle(t, isOverdue);
                  return (
                    <button key={t.id} onClick={() => openTask(t)} className={`w-full text-left rounded px-1.5 py-1 text-[10px] leading-tight truncate border transition-all hover:shadow-sm ${bg}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 shrink-0 ${PRIORITY_COLORS[t.priority] || 'bg-slate-300'}`} />
                      {t.title}
                      {isMyTask(t) && <Star size={8} className="inline ml-0.5 text-amber-500 fill-amber-500" />}
                    </button>
                  );
                })}
                {dayTasks.length > 4 && <p className="text-[9px] text-slate-400 text-center">+{dayTasks.length - 4}</p>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ===== MONTH VIEW (existing) =====
  const renderMonthView = () => {
    const daysInMo = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`e-${i}`} className="min-h-[110px] bg-slate-50/40" />);
    for (let day = 1; day <= daysInMo; day++) {
      const date = new Date(year, month, day);
      const dk = toKey(year, month, day);
      const dayTasks = tasksByDate[dk] || [];
      const tf = isToday(date);
      const expanded = expandedDays[dk];
      const visible = expanded ? dayTasks : dayTasks.slice(0, MAX_VISIBLE);
      const hidden = dayTasks.length - MAX_VISIBLE;
      cells.push(
        <div key={day} className={`min-h-[110px] border border-slate-100 p-1.5 transition-colors ${tf ? 'bg-blue-50/80 ring-2 ring-inset ring-blue-300' : 'bg-white hover:bg-slate-50/60'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full ${tf ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>{day}</span>
            {dayTasks.length > 0 && <span className="text-[10px] bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5 font-medium">{dayTasks.length}</span>}
          </div>
          <div className="space-y-0.5">
            {visible.map(t => <TaskChip key={t.id} task={t} onClick={() => openTask(t)} isOverdueFn={isOverdue} isMyTaskFn={isMyTask} />)}
            {hidden > 0 && <button onClick={() => toggleExpandDay(dk)} className="w-full text-[10px] text-blue-600 hover:text-blue-800 text-center py-0.5 font-medium">ดูเพิ่ม {hidden} งาน</button>}
            {expanded && dayTasks.length > MAX_VISIBLE && <button onClick={() => toggleExpandDay(dk)} className="w-full text-[10px] text-slate-400 hover:text-slate-600 text-center py-0.5">ย่อ</button>}
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200">
          {DAYS_TH.map(d => <div key={d} className="py-2.5 text-center text-xs font-semibold text-slate-500 bg-slate-50">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">{cells}</div>
      </div>
    );
  };

  // ===== YEAR VIEW =====
  const renderYearView = () => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const mTasks = tasksWithDueDate.filter(t => {
        const d = new Date(t.due_date);
        return d.getFullYear() === year && d.getMonth() === i;
      });
      return { month: i, tasks: mTasks };
    });
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {months.map(({ month: m, tasks: mTasks }) => {
          const overdue = mTasks.filter(t => isOverdue(t.due_date, t.status)).length;
          const inProgress = mTasks.filter(t => t.status === 'in_progress').length;
          const completed = mTasks.filter(t => t.status === 'completed').length;
          const tf = today.getFullYear() === year && today.getMonth() === m;
          return (
            <button key={m} onClick={() => { setCurrentDate(new Date(year, m, 1)); setViewMode('month'); }}
              className={`rounded-2xl border p-4 text-left transition-all hover:shadow-md ${tf ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <p className={`text-sm font-bold ${tf ? 'text-blue-700' : 'text-slate-800'}`}>{MONTHS_TH[m]}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{mTasks.length} <span className="text-xs font-normal text-slate-400">งาน</span></p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {overdue > 0 && <span className="inline-flex items-center rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">เกิน {overdue}</span>}
                {inProgress > 0 && <span className="inline-flex items-center rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">ทำ {inProgress}</span>}
                {completed > 0 && <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">เสร็จ {completed}</span>}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderView = () => {
    if (viewMode === 'day') return renderDayView();
    if (viewMode === 'week') return renderWeekView();
    if (viewMode === 'year') return renderYearView();
    return renderMonthView();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">ปฏิทินงาน</h1>
          <p className="mt-1 text-sm text-slate-500">{tasksWithDueDate.length} งานมีวันกำหนด, {tasksWithoutDueDate.length} งานยังไม่กำหนดวัน</p>
        </div>
        {/* View Mode Toggle */}
        <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {VIEW_MODES.map(v => (
            <button key={v.key} onClick={() => setViewMode(v.key)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${viewMode === v.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-600">ตัวกรอง</span>
          {hasActiveFilter && <button onClick={clearFilters} className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium">ล้างตัวกรอง</button>}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหางาน..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:bg-white transition" />
          </div>
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400 transition">
            <option value="">ทุกโครงการ</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.project_name || p.project_code}</option>)}
          </select>
          <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400 transition">
            <option value="">ทุกคน</option>
            {users.filter(u => u.role !== 'client').map(u => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400 transition">
            <option value="">ทุกสถานะ</option>
            {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="flex items-center gap-3">
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400 transition">
              <option value="">ทุก priority</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none whitespace-nowrap">
              <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} className="w-3.5 h-3.5 rounded border-slate-300" />
              เสร็จแล้ว
            </label>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <button onClick={navPrev} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition"><ChevronLeft size={20} /></button>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-800">{getNavLabel()}</h2>
          <button onClick={goToToday} className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 transition">วันนี้</button>
        </div>
        <button onClick={navNext} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition"><ChevronRight size={20} /></button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-400" />เกินกำหนด</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-400" />กำลังทำ</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-400" />เสร็จแล้ว</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-300" />รอดำเนินการ</span>
        <span className="inline-flex items-center gap-1"><Star size={10} className="text-amber-500 fill-amber-500" />งานของฉัน</span>
      </div>

      {/* Main View */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        </div>
      ) : (
        <>
          {renderView()}
          {/* Unscheduled tasks */}
          {tasksWithoutDueDate.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <button onClick={() => setShowUnscheduled(!showUnscheduled)} className="flex items-center gap-2 mb-3 w-full text-left">
                <Clock size={18} className="text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700">งานยังไม่กำหนดวัน ({tasksWithoutDueDate.length})</h3>
                <ChevronDown size={14} className={`ml-auto text-slate-400 transition-transform ${showUnscheduled ? 'rotate-180' : ''}`} />
              </button>
              {showUnscheduled && (
                <div className="flex flex-wrap gap-2">
                  {tasksWithoutDueDate.map(t => (
                    <button key={t.id} onClick={() => openTask(t)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition-all hover:shadow-sm ${getEventStyle(t, isOverdue)}`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLORS[t.priority] || 'bg-slate-300'}`} />
                      <span className="truncate max-w-[150px]">{t.title}</span>
                      {t.project_name && <span className="text-slate-400 hidden sm:inline">· {t.project_name}</span>}
                      {isMyTask(t) && <Star size={10} className="text-amber-500 fill-amber-500 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900">{selectedTask.title}</h3>
                {selectedTask.project_name && <p className="text-sm text-slate-500 mt-0.5">{selectedTask.project_name}</p>}
              </div>
              <button onClick={closeModal} className="ml-3 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 transition"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${TASK_STATUS_COLORS[selectedTask.status] || 'bg-slate-100 text-slate-700'}`}>
                  {TASK_STATUS_LABELS[selectedTask.status] || selectedTask.status}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  <span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[selectedTask.priority] || 'bg-slate-300'}`} />
                  {PRIORITY_LABELS[selectedTask.priority] || selectedTask.priority}
                </span>
                {selectedTask.due_date && isOverdue(selectedTask.due_date, selectedTask.status) && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700"><AlertTriangle size={12} />เกินกำหนด</span>
                )}
                {isMyTask(selectedTask) && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200"><Star size={10} className="fill-amber-500" />งานของฉัน</span>
                )}
              </div>
              <div className="space-y-2.5 text-sm">
                {selectedTask.due_date && <div className="flex items-center gap-2 text-slate-600"><Clock size={14} className="text-slate-400" /><span>กำหนดส่ง: {new Date(selectedTask.due_date).toLocaleDateString('th-TH', { dateStyle: 'long' })}</span></div>}
                {selectedTask.assigned_to_name && <div className="flex items-center gap-2 text-slate-600"><span className="text-xs text-slate-400 w-3.5 text-center">👤</span><span>ผู้รับผิดชอบ: {selectedTask.assigned_to_name}</span></div>}
                {selectedTask.description && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500 mb-1">รายละเอียดงาน</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedTask.description}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4">
              <button onClick={closeModal} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">ปิด</button>
              {selectedTask.project_id && (
                <button onClick={() => { closeModal(); navigate(`/projects/${selectedTask.project_id}`); }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                  <ExternalLink size={14} />ไปที่หน้างาน
                </button>
              )}
              <button onClick={() => { closeModal(); navigate('/tasks'); }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
                <Edit2 size={14} />แก้ไข
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { ChevronLeft, ChevronRight, Clock, AlertTriangle, Edit2, ExternalLink, X, Star, Search, ChevronDown, Filter, CalendarDays, Target, CheckCircle2, TrendingUp } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksAPI, projectsAPI, usersAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { PRIORITY_LABELS } from '../utils/constants';

// TODO: Phase 2.3 — Holiday calendar + working day calculation
// TODO: Phase 2.4 — Drag/drop หรือ resize bar

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
const VIEW_MODES = [{ key: 'day', label: 'วัน' }, { key: 'week', label: 'สัปดาห์' }, { key: 'month', label: 'เดือน' }, { key: 'year', label: 'ปี' }];
const DISPLAY_MODES = [{ key: 'dueDate', label: 'ครบกำหนด' }, { key: 'workRange', label: 'ช่วงเวลาทำงาน' }];
const QUICK_FILTERS = [
  { key: '', label: 'ทั้งหมด' }, { key: 'today', label: 'วันนี้' }, { key: 'overdue', label: 'เกินกำหนด' },
  { key: 'thisWeek', label: 'สัปดาห์นี้' }, { key: 'urgent', label: 'เร่งด่วน' }, { key: 'myTasks', label: 'งานของฉัน' },
];

// ===== Helpers =====
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfMonth(y, m) { return new Date(y, m, 1).getDay(); }
function isSameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isToday(d) { return isSameDay(d, new Date()); }
function toKey(y, m, d) { return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
function getWeekStart(date) { const d = new Date(date); d.setDate(d.getDate() - d.getDay()); return d; }
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function formatLocalDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function parseLocalDate(str) { const [y, m, d] = str.split('-').map(Number); return new Date(y, m - 1, d); }
function isDateInRange(date, startStr, endStr) {
  if (!startStr || !endStr) return false;
  const dk = formatLocalDate(date);
  return dk >= startStr && dk <= endStr;
}
function getTaskRange(task) {
  const dueKey = task.due_date ? task.due_date.split('T')[0] : null;
  const startKey = task.start_date ? task.start_date.split('T')[0] : null;
  if (!dueKey) return { start: null, end: null, hasRange: false };
  const effectiveStart = startKey || dueKey;
  // start_date > due_date → fallback
  const rangeStart = effectiveStart <= dueKey ? effectiveStart : dueKey;
  return { start: rangeStart, end: dueKey, hasRange: startKey && startKey < dueKey };
}
function getBarBgStyle(task, isOverdueFn) {
  if (task.status === 'completed' || task.status === 'cancelled') return 'bg-emerald-200 border-emerald-300 text-emerald-800 opacity-60';
  if (isOverdueFn(task.due_date, task.status)) return 'bg-red-200 border-red-300 text-red-800';
  if (task.status === 'in_progress') return 'bg-blue-200 border-blue-300 text-blue-800';
  return 'bg-slate-200 border-slate-300 text-slate-700';
}

// ===== Dynamic User Helpers (ไม่ hardcode) =====
function getUserColor(userId) {
  let hash = 0;
  for (let i = 0; i < String(userId || '').length; i++) hash = String(userId).charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 55%)`;
}
function getUserInitials(name) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
}
function UserAvatar({ name, userId, size = 'w-6 h-6 text-[10px]' }) {
  return <span className={`inline-flex items-center justify-center rounded-full font-bold text-white shrink-0 ${size}`} style={{ backgroundColor: getUserColor(userId) }} title={name || 'ไม่ระบุ'}>{getUserInitials(name)}</span>;
}

function getEventStyle(t, isOverdueFn) {
  if (t.status === 'completed' || t.status === 'cancelled') return EVENT_BG.completed;
  if (isOverdueFn(t.due_date, t.status)) return EVENT_BG.overdue;
  if (t.status === 'in_progress') return EVENT_BG.in_progress;
  return EVENT_BG.pending;
}

function TaskChip({ task, onClick, isOverdueFn, isMyTaskFn, users }) {
  const a = users.find(u => u.id === task.assigned_to);
  return (
    <button onClick={onClick} title={a ? `${task.title} — ${a.full_name}` : task.title}
      className={`w-full text-left rounded border px-2 py-1.5 text-[11px] leading-tight transition-all hover:shadow-sm ${getEventStyle(task, isOverdueFn)}`}>
      <div className="flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] || 'bg-slate-300'}`} />
        <span className="truncate font-medium">{task.title}</span>
        {a && <UserAvatar name={a.full_name} userId={a.id} size="w-4 h-4 text-[7px]" />}
      </div>
    </button>
  );
}

function TaskListCard({ task, onClick, isOverdueFn, isMyTaskFn, users }) {
  const a = users.find(u => u.id === task.assigned_to);
  const overdue = task.due_date && isOverdueFn(task.due_date, task.status);
  return (
    <button onClick={onClick} className={`w-full text-left rounded-xl border px-4 py-3 transition-all hover:shadow-sm ${getEventStyle(task, isOverdueFn)}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLORS[task.priority] || 'bg-slate-300'}`} />
            <span className="font-medium text-sm truncate">{task.title}</span>
            {isMyTaskFn(task) && <Star size={10} className="shrink-0 text-amber-500 fill-amber-500" />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] opacity-70">
            {a && <div className="flex items-center gap-1"><UserAvatar name={a.full_name} userId={a.id} size="w-4 h-4 text-[8px]" /><span>{a.full_name}</span></div>}
            {!a && <span className="italic">ยังไม่มอบหมาย</span>}
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TASK_STATUS_COLORS[task.status] || ''}`}>{TASK_STATUS_LABELS[task.status] || task.status}</span>
          </div>
        </div>
        {overdue && <span className="shrink-0 inline-flex items-center gap-0.5 rounded-lg bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700"><AlertTriangle size={10} />เกินกำหนด</span>}
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
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const [showUnscheduled, setShowUnscheduled] = useState(true);
  const [expandedDays, setExpandedDays] = useState({});
  const [viewMode, setViewMode] = useState('month');
  const [displayMode, setDisplayMode] = useState('dueDate');
  const [expandedWeeks, setExpandedWeeks] = useState({}); // week key → true = แสดง lanes ทั้งหมด
  const [quickFilter, setQuickFilter] = useState('');
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

  // ===== Data Loading (ไม่ refetch ซ้ำ) =====
  useEffect(() => {
    Promise.all([projectsAPI.getAll({ limit: 100 }), usersAPI.getAll({ limit: 100 })])
      .then(([p, u]) => { setProjects(Array.isArray(p) ? p : p?.data || []); setUsers(Array.isArray(u) ? u : u?.data || []); })
      .catch(() => {});
  }, []);
  useEffect(() => { loadTasks(); }, [currentDate, viewMode]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const { start_date, end_date } = getDateRange();
      const res = await tasksAPI.getAll({ limit: viewMode === 'year' ? 1000 : 100, start_date, end_date });
      setTasks(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getDateRange = useCallback(() => {
    if (viewMode === 'day') return { start_date: formatLocalDate(currentDate), end_date: formatLocalDate(currentDate) };
    if (viewMode === 'week') { const ws = getWeekStart(currentDate); return { start_date: formatLocalDate(ws), end_date: formatLocalDate(addDays(ws, 6)) }; }
    if (viewMode === 'year') return { start_date: formatLocalDate(new Date(year, 0, 1)), end_date: formatLocalDate(new Date(year, 11, 31)) };
    return { start_date: formatLocalDate(new Date(year, month, 1)), end_date: formatLocalDate(new Date(year, month + 1, 0)) };
  }, [viewMode, currentDate, year, month]);

  const isOverdue = useCallback((dueDate, status) => {
    if (status === 'completed' || status === 'cancelled' || !dueDate) return false;
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const d = new Date(dueDate); d.setHours(0, 0, 0, 0);
    return d < t;
  }, []);
  const isMyTask = useCallback((t) => t.assigned_to === user?.id, [user]);

  // ===== Filters =====
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!showCompleted && t.status === 'completed') return false;
      if (filterProject && t.project_id !== filterProject) return false;
      if (filterAssignee && t.assigned_to !== filterAssignee) return false;
      if (filterStatus && t.status !== filterStatus) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (searchQuery) { const q = searchQuery.toLowerCase(); if (!(t.title||'').toLowerCase().includes(q) && !(t.project_name||'').toLowerCase().includes(q) && !(t.assigned_to_name||'').toLowerCase().includes(q)) return false; }
      if (quickFilter === 'today') { const dk = formatLocalDate(today); if (!t.due_date || t.due_date.split('T')[0] !== dk) return false; }
      if (quickFilter === 'overdue' && !isOverdue(t.due_date, t.status)) return false;
      if (quickFilter === 'thisWeek') { const ws = getWeekStart(today); const we = addDays(ws, 6); if (!t.due_date) return false; const dk = t.due_date.split('T')[0]; if (dk < formatLocalDate(ws) || dk > formatLocalDate(we)) return false; }
      if (quickFilter === 'urgent' && t.priority !== 'urgent' && t.priority !== 'high') return false;
      if (quickFilter === 'myTasks' && t.assigned_to !== user?.id) return false;
      return true;
    });
  }, [tasks, showCompleted, filterProject, filterAssignee, filterStatus, filterPriority, searchQuery, quickFilter, user, isOverdue]);

  // ===== Derived Data =====
  const tasksWithDueDate = useMemo(() => filteredTasks.filter(t => t.due_date), [filteredTasks]);
  const tasksWithoutDueDate = useMemo(() => filteredTasks.filter(t => !t.due_date), [filteredTasks]);

  const tasksByDate = useMemo(() => {
    const m = {};
    if (displayMode === 'workRange') {
      // โหมดช่วงเวลาทำงาน — แสดง task ในทุกวันที่ start_date → due_date
      filteredTasks.forEach(t => {
        const range = getTaskRange(t);
        if (!range.end) return; // ไม่มี due_date → อยู่ใน "ยังไม่กำหนดวัน"
        let current = parseLocalDate(range.start);
        const end = parseLocalDate(range.end);
        while (current <= end) {
          const dk = formatLocalDate(current);
          if (!m[dk]) m[dk] = [];
          const isStart = dk === range.start;
          const isDue = dk === range.end;
          m[dk].push({ ...t, _barType: isStart ? 'start' : isDue ? 'due' : 'middle' });
          current = addDays(current, 1);
        }
      });
    } else {
      // โหมดครบกำหนด — due_date เดิม
      tasksWithDueDate.forEach(t => { const d = t.due_date.split('T')[0]; if (!m[d]) m[d] = []; m[d].push(t); });
    }
    return m;
  }, [filteredTasks, displayMode, tasksWithDueDate]);
  const todayKey = formatLocalDate(today);
  const todayTasks = useMemo(() => filteredTasks.filter(t => t.due_date && t.due_date.split('T')[0] === todayKey), [filteredTasks, todayKey]);
  const overdueTasks = useMemo(() => filteredTasks.filter(t => isOverdue(t.due_date, t.status)), [filteredTasks, isOverdue]);
  const myTasks = useMemo(() => filteredTasks.filter(t => t.assigned_to === user?.id), [filteredTasks, user]);
  const urgentTasks = useMemo(() => filteredTasks.filter(t => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed'), [filteredTasks]);
  const completedTasks = useMemo(() => filteredTasks.filter(t => t.status === 'completed'), [filteredTasks]);
  const nearDueTasks = useMemo(() => {
    const we = addDays(getWeekStart(today), 6);
    return filteredTasks.filter(t => { if (!t.due_date || t.status === 'completed') return false; const dk = t.due_date.split('T')[0]; return dk >= todayKey && dk <= formatLocalDate(we); }).sort((a, b) => (a.due_date||'').localeCompare(b.due_date||''));
  }, [filteredTasks, todayKey]);

  const workload = useMemo(() => {
    const m = {};
    users.filter(u => u.role !== 'client').forEach(u => { m[u.id] = { user: u, total: 0, active: 0, overdue: 0 }; });
    filteredTasks.forEach(t => { if (t.assigned_to && m[t.assigned_to]) { m[t.assigned_to].total++; if (t.status !== 'completed' && t.status !== 'cancelled') m[t.assigned_to].active++; if (isOverdue(t.due_date, t.status)) m[t.assigned_to].overdue++; } });
    return Object.values(m).filter(w => w.total > 0).sort((a, b) => b.active - a.active);
  }, [filteredTasks, users, isOverdue]);

  const selectedDayTasks = useMemo(() => {
    if (!selectedDate) return [];
    const dk = formatLocalDate(selectedDate);
    return filteredTasks.filter(t => t.due_date && t.due_date.split('T')[0] === dk);
  }, [filteredTasks, selectedDate]);

  const clearFilters = () => { setFilterProject(''); setFilterAssignee(''); setFilterStatus(''); setFilterPriority(''); setSearchQuery(''); setQuickFilter(''); };
  const hasActiveFilter = filterProject || filterAssignee || filterStatus || filterPriority || searchQuery || quickFilter;

  // ===== Navigation =====
  const navPrev = () => { if (viewMode === 'day') setCurrentDate(d => addDays(d, -1)); else if (viewMode === 'week') setCurrentDate(d => addDays(d, -7)); else if (viewMode === 'month') setCurrentDate(new Date(year, month - 1, 1)); else setCurrentDate(new Date(year - 1, month, 1)); };
  const navNext = () => { if (viewMode === 'day') setCurrentDate(d => addDays(d, 1)); else if (viewMode === 'week') setCurrentDate(d => addDays(d, 7)); else if (viewMode === 'month') setCurrentDate(new Date(year, month + 1, 1)); else setCurrentDate(new Date(year + 1, month, 1)); };
  const goToToday = () => { setCurrentDate(new Date()); setSelectedDate(new Date()); };
  const getNavLabel = () => {
    if (viewMode === 'day') return `${currentDate.getDate()} ${MONTHS_TH[currentDate.getMonth()]} ${currentDate.getFullYear() + 543}`;
    if (viewMode === 'week') { const ws = getWeekStart(currentDate); const we = addDays(ws, 6); return `${ws.getDate()} ${MONTHS_TH[ws.getMonth()].slice(0,3)} - ${we.getDate()} ${MONTHS_TH[we.getMonth()].slice(0,3)} ${we.getFullYear()+543}`; }
    if (viewMode === 'month') return `${MONTHS_TH[month]} ${year + 543}`;
    return `ปี ${year + 543}`;
  };
  const getTasksForDay = (date) => tasksByDate[formatLocalDate(date)] || [];
  const toggleExpandDay = (key) => setExpandedDays(p => ({ ...p, [key]: !p[key] }));
  const MAX_VISIBLE = 3;

  // ===== Views =====
  const renderDayView = () => {
    const dt = getTasksForDay(currentDate); const tf = isToday(currentDate);
    // ใน workRange mode แสดง badge ว่าเป็น start/middle/due
    return (<div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className={`px-5 py-4 border-b border-slate-100 ${tf?'bg-blue-50':''}`}>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center justify-center w-12 h-12 text-lg font-bold rounded-2xl ${tf?'bg-blue-600 text-white':'bg-slate-100 text-slate-700'}`}>{currentDate.getDate()}</span>
          <div><p className="text-sm font-semibold text-slate-800">{DAYS_TH[currentDate.getDay()]}</p><p className="text-xs text-slate-500">{MONTHS_TH[currentDate.getMonth()]} {currentDate.getFullYear()+543}</p></div>
          {dt.length > 0 && <span className="ml-auto text-sm font-bold text-slate-700">{dt.length} งาน</span>}
        </div>
      </div>
      <div className="p-4 space-y-2">
        {dt.length === 0 ? <p className="text-center text-sm text-slate-400 py-8">ไม่มีงานในวันนี้</p> : dt.map(t => {
          // workRange mode: เพิ่ม badge
          if (displayMode === 'workRange' && t._barType) {
            const badge = t._barType === 'start' ? 'วันเริ่ม' : t._barType === 'due' ? 'ครบกำหนด' : 'กำลังดำเนินการ';
            const badgeColor = t._barType === 'start' ? 'bg-blue-100 text-blue-700' : t._barType === 'due' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700';
            return (
              <div key={t.id} className={`rounded-xl border px-4 py-3 transition-all hover:shadow-sm ${getBarBgStyle(t, isOverdue)}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLORS[t.priority] || 'bg-slate-300'}`} />
                      <span className="font-medium text-sm truncate">{t.title}</span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold ${badgeColor}`}>{badge}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] opacity-70">
                      {(() => { const a = users.find(u => u.id === t.assigned_to); return a ? <div className="flex items-center gap-1"><UserAvatar name={a.full_name} userId={a.id} size="w-4 h-4 text-[8px]" /><span>{a.full_name}</span></div> : <span className="italic">ยังไม่มอบหมาย</span>; })()}
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return <TaskListCard key={t.id} task={t} onClick={() => setSelectedTask(t)} isOverdueFn={isOverdue} isMyTaskFn={isMyTask} users={users} />;
        })}
      </div>
    </div>);
  };

  const renderWeekView = () => {
    const ws = getWeekStart(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    const we = addDays(ws, 6);
    const { segments, laneCount } = displayMode === 'workRange' ? assignLanes(filteredTasks, ws, we) : { segments: [], laneCount: 0 };
    const MAX_LANES = 3;
    const weekKey = formatLocalDate(ws);
    const weekExpanded = expandedWeeks[weekKey];
    const displayLaneCount = weekExpanded ? Math.min(laneCount, 8) : Math.min(laneCount, MAX_LANES);
    const displaySegments = segments.filter(s => s.lane < displayLaneCount);
    const overflow = laneCount - displayLaneCount;

    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {days.map((d, i) => { const tf = isToday(d); return (
            <div key={i} className={`py-2.5 text-center border-r border-slate-100 last:border-r-0 ${tf ? 'bg-blue-50' : 'bg-slate-50'}`}>
              <p className={`text-[10px] font-medium ${tf ? 'text-blue-600' : 'text-slate-400'}`}>{DAYS_TH[d.getDay()]}</p>
              <p className={`inline-flex items-center justify-center w-7 h-7 mt-0.5 text-sm font-bold rounded-full ${tf ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>{d.getDate()}</p>
            </div>
          );})}
        </div>

        {/* Chip rows — dueDate mode */}
        {displayMode === 'dueDate' && (
          <div className="grid grid-cols-7 min-h-[200px]">
            {days.map((d, i) => { const dt = getTasksForDay(d); return (
              <div key={i} className="border-r border-slate-100 last:border-r-0 p-1 space-y-1">
                {dt.slice(0, 4).map(t => <TaskChip key={t.id} task={t} onClick={() => setSelectedTask(t)} isOverdueFn={isOverdue} isMyTaskFn={isMyTask} users={users} />)}
                {dt.length > 4 && <p className="text-[9px] text-slate-400 text-center">+{dt.length - 4}</p>}
              </div>
            );})}
          </div>
        )}

        {/* Bar rows — workRange mode */}
        {displayMode === 'workRange' && (
          <div className="min-h-[200px] bg-slate-50/50 p-1">
            {Array.from({ length: displayLaneCount }, (_, lane) => {
              const laneSegs = displaySegments.filter(s => s.lane === lane);
              return (
                <div key={lane} className="grid grid-cols-7 gap-0 h-[28px] mb-1">
                  {Array.from({ length: 7 }, (_, col) => {
                    const seg = laneSegs.find(s => col >= s.startCol && col <= s.endCol);
                    if (!seg) return <div key={col} />;
                    const isStart = col === seg.startCol;
                    const isEnd = col === seg.endCol;
                    const a = users.find(u => u.id === seg.task.assigned_to);
                    const barBg = getBarBgStyle(seg.task, isOverdue);
                    const roundedLeft = isStart ? 'rounded-l-md' : 'rounded-none';
                    const roundedRight = isEnd ? 'rounded-r-md' : 'rounded-none';
                    return (
                      <div key={col} className="flex items-center">
                        <button onClick={() => setSelectedTask(seg.task)}
                          title={`${seg.task.title}${a ? ` — ${a.full_name}` : ''} (${formatLocalDate(seg.start)} → ${formatLocalDate(seg.end)})`}
                          className={`w-full h-[24px] flex items-center gap-1 px-1.5 border ${barBg} ${roundedLeft} ${roundedRight} text-[10px] font-medium truncate transition-all hover:shadow-sm cursor-pointer`}>
                          {isStart && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_COLORS[seg.task.priority] || 'bg-slate-300'}`} />}
                          {(isStart || (!isStart && !isEnd)) && <span className="truncate">{seg.task.title}</span>}
                          {a && <UserAvatar name={a.full_name} userId={a.id} size="w-3 h-3 text-[6px]" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {overflow > 0 && !weekExpanded && (
              <button onClick={() => setExpandedWeeks(p => ({ ...p, [weekKey]: true }))}
                className="w-full text-center text-[9px] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium mt-1 py-1">
                +{overflow} งานอื่นๆ
              </button>
            )}
            {weekExpanded && overflow > 0 && (
              <button onClick={() => setExpandedWeeks(p => { const n = { ...p }; delete n[weekKey]; return n; })}
                className="w-full text-center text-[9px] text-slate-500 hover:text-slate-700 hover:underline cursor-pointer font-medium mt-1 py-1">
                ย่อกลับ
              </button>
            )}
            {laneCount === 0 && <p className="text-center text-sm text-slate-400 py-8">ไม่มีงานในสัปดาห์นี้</p>}
          </div>
        )}
      </div>
    );
  };

  // ===== Lane assignment สำหรับ multi-day bars =====
  const assignLanes = (tasks, weekStart, weekEnd) => {
    const segments = tasks.map(t => {
      const range = getTaskRange(t);
      if (!range.end) return null;
      const s = parseLocalDate(range.start);
      const e = parseLocalDate(range.end);
      // Clamp to visible week
      const segStart = s < weekStart ? weekStart : s;
      const segEnd = e > weekEnd ? weekEnd : e;
      if (segStart > segEnd) return null;
      const startCol = Math.floor((segStart - weekStart) / 86400000);
      const endCol = Math.floor((segEnd - weekStart) / 86400000);
      return { task: t, startCol, endCol, start: segStart, end: segEnd };
    }).filter(Boolean);
    // Sort by startCol, then by span (longer first)
    segments.sort((a, b) => a.startCol - b.startCol || (b.endCol - b.startCol) - (a.endCol - a.startCol));
    // Assign lanes
    const lanes = [];
    segments.forEach(seg => {
      let placed = false;
      for (let lane = 0; lane < lanes.length; lane++) {
        const last = lanes[lane];
        if (seg.startCol > last.endCol) { lanes[lane] = seg; seg.lane = lane; placed = true; break; }
      }
      if (!placed) { seg.lane = lanes.length; lanes.push(seg); }
    });
    return { segments, laneCount: lanes.length };
  };

  const renderMonthView = () => {
    const daysInMo = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const MAX_LANES = 3;
    const rows = [];

    // Build week rows
    let dayOffset = 1;
    for (let weekIdx = 0; dayOffset <= daysInMo; weekIdx++) {
      const weekStart = new Date(year, month, dayOffset);
      const weekEnd = new Date(year, month, Math.min(dayOffset + 6, daysInMo));
      const { segments, laneCount } = displayMode === 'workRange'
        ? assignLanes(filteredTasks, weekStart, weekEnd)
        : { segments: [], laneCount: 0 };

      const weekDays = [];
      for (let col = 0; col < 7; col++) {
        const dayNum = dayOffset + col;
        if (dayNum > daysInMo) { weekDays.push(<div key={`empty-${weekIdx}-${col}`} className="bg-slate-50/40 border border-slate-100" />); continue; }
        const date = new Date(year, month, dayNum);
        const dk = toKey(year, month, dayNum);
        const dt = displayMode === 'dueDate' ? (tasksByDate[dk] || []) : [];
        const tf = isToday(date);
        const isSelected = selectedDate && isSameDay(date, selectedDate);
        const visibleChips = dt.slice(0, 3);
        const hiddenChips = dt.length - 3;

        weekDays.push(
          <div key={dayNum} onClick={() => setSelectedDate(date)}
            className={`border border-slate-100 p-1.5 transition-colors cursor-pointer min-h-[90px] ${tf ? 'bg-blue-50/80 ring-2 ring-inset ring-blue-300' : isSelected ? 'bg-indigo-50/50 ring-1 ring-inset ring-indigo-200' : 'bg-white hover:bg-slate-50/60'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full ${tf ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{dayNum}</span>
              {dt.length > 0 && <span className="text-[9px] bg-slate-200 text-slate-500 rounded-full px-1 py-0.5">{dt.length}</span>}
            </div>
            {visibleChips.map(t => <TaskChip key={t.id} task={t} onClick={(e) => { e.stopPropagation(); setSelectedTask(t); }} isOverdueFn={isOverdue} isMyTaskFn={isMyTask} users={users} />)}
            {hiddenChips > 0 && <button onClick={(e) => { e.stopPropagation(); toggleExpandDay(dk); }} className="w-full text-[9px] text-blue-600 hover:text-blue-800 text-center py-0.5 font-medium">+{hiddenChips}</button>}
          </div>
        );
      }

      // Bar rows — lane 0, 1, 2+
      let finalBarRows = [];
      if (displayMode === 'workRange' && segments.length > 0) {
        const weekExpanded = expandedWeeks[`week-${weekIdx}`];
        const displayLaneCount = weekExpanded ? Math.min(laneCount, 8) : Math.min(laneCount, MAX_LANES);
        const displaySegments = segments.filter(s => s.lane < displayLaneCount);

        for (let lane = 0; lane < displayLaneCount; lane++) {
          const laneSegs = displaySegments.filter(s => s.lane === lane);
          const cells = Array.from({ length: 7 }, (_, col) => {
            const seg = laneSegs.find(s => col >= s.startCol && col <= s.endCol);
            if (!seg) return <div key={col} className="bg-transparent" />;
            const isStart = col === seg.startCol;
            const isEnd = col === seg.endCol;
            const a = users.find(u => u.id === seg.task.assigned_to);
            const barBg = getBarBgStyle(seg.task, isOverdue);
            const roundedLeft = isStart ? 'rounded-l-md' : '';
            const roundedRight = isEnd ? 'rounded-r-md' : '';
            return (
              <div key={col} className="flex items-center">
                <button onClick={(e) => { e.stopPropagation(); setSelectedTask(seg.task); }}
                  title={`${seg.task.title}${a ? ` — ${a.full_name}` : ''} (${formatLocalDate(seg.start)} → ${formatLocalDate(seg.end)})`}
                  className={`w-full h-[22px] flex items-center gap-1 px-1.5 border ${barBg} ${roundedLeft} ${roundedRight} text-[10px] font-medium truncate transition-all hover:shadow-sm cursor-pointer`}>
                  {isStart && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_COLORS[seg.task.priority] || 'bg-slate-300'}`} />}
                  {(isStart || (!isStart && !isEnd)) && <span className="truncate">{seg.task.title}</span>}
                  {a && <UserAvatar name={a.full_name} userId={a.id} size="w-3.5 h-3.5 text-[6px]" />}
                </button>
              </div>
            );
          });
          finalBarRows.push(<div key={lane} className="grid grid-cols-7 gap-0 h-[24px]">{cells}</div>);
        }

        // Overflow indicator
        const overflow = laneCount - MAX_LANES;
        if (overflow > 0 && !weekExpanded) {
          finalBarRows.push(
            <div key="overflow" className="h-[22px] flex items-center justify-center">
              <button onClick={(e) => { e.stopPropagation(); setExpandedWeeks(p => ({ ...p, [`week-${weekIdx}`]: true })); }}
                className="text-[9px] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium">
                +{overflow} งานอื่นๆ
              </button>
            </div>
          );
        }
        if (weekExpanded && overflow > 0) {
          finalBarRows.push(
            <div key="collapse" className="h-[22px] flex items-center justify-center">
              <button onClick={(e) => { e.stopPropagation(); setExpandedWeeks(p => { const n = { ...p }; delete n[`week-${weekIdx}`]; return n; }); }}
                className="text-[9px] text-slate-500 hover:text-slate-700 hover:underline cursor-pointer font-medium">
                ย่อกลับ
              </button>
            </div>
          );
        }
      }

      rows.push(
        <div key={`week-${weekIdx}`} className="border-b border-slate-100 last:border-b-0">
          <div className="grid grid-cols-7">
            {weekDays}
          </div>
          {finalBarRows.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50/50 px-0.5">
              {finalBarRows}
            </div>
          )}
        </div>
      );
      dayOffset += 7;
    }

    return (<div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200">{DAYS_TH.map(d => <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 bg-slate-50">{d}</div>)}</div>
      {rows}
    </div>);
  };

  const renderYearView = () => {
    const months = Array.from({ length: 12 }, (_, i) => ({ month: i, tasks: tasksWithDueDate.filter(t => { const d = new Date(t.due_date); return d.getFullYear() === year && d.getMonth() === i; }) }));
    return (<div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{months.map(({ month: m, tasks: mt }) => {
      const overdue = mt.filter(t => isOverdue(t.due_date, t.status)).length;
      const inProg = mt.filter(t => t.status === 'in_progress').length;
      const comp = mt.filter(t => t.status === 'completed').length;
      const tf = today.getFullYear() === year && today.getMonth() === m;
      return (<button key={m} onClick={() => { setCurrentDate(new Date(year, m, 1)); setSelectedDate(new Date(year, m, 1)); setViewMode('month'); }}
        className={`rounded-2xl border p-4 text-left transition-all hover:shadow-md ${tf ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
        <p className={`text-sm font-bold ${tf ? 'text-blue-700' : 'text-slate-800'}`}>{MONTHS_TH[m]}</p>
        <p className="mt-2 text-2xl font-bold text-slate-900">{mt.length} <span className="text-xs font-normal text-slate-400">งาน</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {overdue > 0 && <span className="inline-flex items-center rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">เกิน {overdue}</span>}
          {inProg > 0 && <span className="inline-flex items-center rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">ทำ {inProg}</span>}
          {comp > 0 && <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">เสร็จ {comp}</span>}
        </div>
      </button>);})}</div>);
  };

  const renderView = () => { if (viewMode === 'day') return renderDayView(); if (viewMode === 'week') return renderWeekView(); if (viewMode === 'year') return renderYearView(); return renderMonthView(); };

  return (
    <div className="flex gap-5 min-h-[calc(100vh-8rem)]">
      {/* Main Calendar */}
      <div className="flex-1 min-w-0 space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">ปฏิทินงาน</h1>
          <p className="mt-1 text-sm text-slate-500">ติดตามงาน กำหนดส่ง และภาพรวมทีม</p>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map(f => (
            <button key={f.key} onClick={() => setQuickFilter(quickFilter === f.key ? '' : f.key)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${quickFilter === f.key ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
              {f.key === 'urgent' && <span className="w-2 h-2 rounded-full bg-red-500" />}
              {f.key === 'overdue' && <AlertTriangle size={12} />}
              {f.key === 'myTasks' && <Star size={12} />}
              {f.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-500">ตัวกรอง</span>
            {hasActiveFilter && <button onClick={clearFilters} className="ml-auto text-[11px] text-blue-600 hover:text-blue-800 font-medium">ล้างตัวกรอง</button>}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <div className="relative"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ค้นหางาน..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-xs text-slate-700 outline-none focus:border-blue-400 focus:bg-white transition" /></div>
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:border-blue-400"><option value="">ทุกโครงการ</option>{projects.map(p => <option key={p.id} value={p.id}>{p.project_name || p.project_code}</option>)}</select>
            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:border-blue-400"><option value="">ทุกคน</option>{users.filter(u => u.role !== 'client').map(u => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}</select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:border-blue-400"><option value="">ทุกสถานะ</option>{Object.entries(TASK_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <div className="flex items-center gap-2">
              <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs outline-none focus:border-blue-400"><option value="">ทุก priority</option>{Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer select-none whitespace-nowrap"><input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} className="w-3 h-3 rounded border-slate-300" />เสร็จ</label>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <button onClick={navPrev} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition"><ChevronLeft size={20} /></button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">{VIEW_MODES.map(v => <button key={v.key} onClick={() => setViewMode(v.key)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${viewMode === v.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>{v.label}</button>)}</div>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-1">{DISPLAY_MODES.map(d => <button key={d.key} onClick={() => setDisplayMode(d.key)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${displayMode === d.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>{d.label}</button>)}</div>
            <span className="text-sm font-bold text-slate-800">{getNavLabel()}</span>
            <button onClick={goToToday} className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-100 transition">วันนี้</button>
          </div>
          <button onClick={navNext} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition"><ChevronRight size={20} /></button>
        </div>

        {loading ? <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" /></div> : (
          <>
            {renderView()}
            {tasksWithoutDueDate.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <button onClick={() => setShowUnscheduled(!showUnscheduled)} className="flex items-center gap-2 mb-3 w-full text-left">
                  <Clock size={16} className="text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700">งานยังไม่กำหนดวัน ({tasksWithoutDueDate.length})</h3>
                  <ChevronDown size={14} className={`ml-auto text-slate-400 transition-transform ${showUnscheduled ? 'rotate-180' : ''}`} />
                </button>
                {showUnscheduled && <div className="flex flex-wrap gap-2">{tasksWithoutDueDate.map(t => { const a = users.find(u => u.id === t.assigned_to); return (
                  <button key={t.id} onClick={() => setSelectedTask(t)} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition-all hover:shadow-sm ${getEventStyle(t, isOverdue)}`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_COLORS[t.priority] || 'bg-slate-300'}`} />
                    <span className="truncate max-w-[150px]">{t.title}</span>
                    {a && <UserAvatar name={a.full_name} userId={a.id} size="w-4 h-4 text-[8px]" />}
                    {isMyTask(t) && <Star size={10} className="text-amber-500 fill-amber-500 shrink-0" />}
                  </button>);})}</div>}
              </div>
            )}
          </>
        )}
      </div>

      {/* Right Sidebar — Summary Panel */}
      <div className="w-72 shrink-0 space-y-4 hidden lg:block">
        {/* Summary Cards */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">สรุปภาพรวม</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'งานทั้งหมด', count: filteredTasks.length, color: 'text-slate-800', filter: '' },
              { label: 'กำลังทำ', count: filteredTasks.filter(t => t.status === 'in_progress').length, color: 'text-blue-600', filter: '' },
              { label: 'เกินกำหนด', count: overdueTasks.length, color: 'text-red-600', filter: 'overdue' },
              { label: 'เสร็จสิ้น', count: completedTasks.length, color: 'text-emerald-600', filter: '' },
              { label: 'เร่งด่วน', count: urgentTasks.length, color: 'text-orange-600', filter: 'urgent' },
              { label: 'งานของฉัน', count: myTasks.length, color: 'text-amber-600', filter: 'myTasks' },
            ].map(s => (
              <button key={s.label} onClick={() => setQuickFilter(quickFilter === s.filter ? '' : s.filter)}
                className={`rounded-xl p-2.5 text-center transition-all ${quickFilter === s.filter ? 'bg-blue-100 ring-1 ring-blue-300' : 'bg-slate-50 hover:bg-slate-100'}`}>
                <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
                <p className="text-[10px] text-slate-500">{s.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Day Tasks */}
        {selectedDate && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">งานวันที่ {selectedDate.getDate()} {MONTHS_TH[selectedDate.getMonth()]} <span className="text-xs font-normal text-slate-400">({selectedDayTasks.length})</span></h3>
            {selectedDayTasks.length === 0 ? <p className="text-xs text-slate-400 py-2">ไม่มีงานในวันนี้</p> : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">{selectedDayTasks.map(t => <TaskListCard key={t.id} task={t} onClick={() => setSelectedTask(t)} isOverdueFn={isOverdue} isMyTaskFn={isMyTask} users={users} />)}</div>
            )}
          </div>
        )}

        {/* My Tasks */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Star size={14} className="text-amber-500 fill-amber-500" /> งานของฉัน
            <span className="ml-auto bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-[10px] font-bold">{myTasks.length}</span>
          </h3>
          {myTasks.length === 0 ? <p className="text-[11px] text-slate-400">ไม่มีงานที่มอบหมาย</p> : (
            <div className="space-y-1 max-h-32 overflow-y-auto">{myTasks.slice(0, 5).map(t => (
              <button key={t.id} onClick={() => setSelectedTask(t)} className={`w-full text-left rounded-lg px-2 py-1 text-[11px] truncate transition hover:bg-slate-50 ${isOverdue(t.due_date, t.status) ? 'text-red-600 font-medium' : 'text-slate-700'}`}>{t.title}{t.due_date && <span className="ml-1 text-[10px] text-slate-400">{t.due_date.split('T')[0]}</span>}</button>
            ))}{myTasks.length > 5 && <p className="text-[10px] text-slate-400 text-center">+{myTasks.length - 5} งาน</p>}</div>
          )}
        </div>

        {/* Workload */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">ภาระงานรายคน</h3>
          {workload.length === 0 ? <p className="text-[11px] text-slate-400">ไม่มีงานมอบหมาย</p> : (
            <div className="space-y-2.5 max-h-48 overflow-y-auto">{workload.map(w => {
              const maxW = Math.max(...workload.map(x => x.active), 1); const pct = Math.round((w.active / maxW) * 100);
              return (<div key={w.user.id}>
                <div className="flex items-center gap-2 mb-1">
                  <UserAvatar name={w.user.full_name} userId={w.user.id} size="w-5 h-5 text-[9px]" />
                  <span className="text-[11px] font-medium text-slate-700 truncate">{w.user.full_name}</span>
                  <span className="ml-auto text-[10px] text-slate-500">{w.active} งาน</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5"><div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: getUserColor(w.user.id) }} /></div>
                {w.overdue > 0 && <p className="text-[9px] text-red-500 mt-0.5">{w.overdue} เกินกำหนด</p>}
              </div>);})}</div>
          )}
        </div>
      </div>

      {/* Task Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelectedTask(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div className="flex-1 min-w-0"><h3 className="text-lg font-bold text-slate-900">{selectedTask.title}</h3>{selectedTask.project_name && <p className="text-sm text-slate-500 mt-0.5">{selectedTask.project_name}</p>}</div>
              <button onClick={() => setSelectedTask(null)} className="ml-3 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 transition"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${TASK_STATUS_COLORS[selectedTask.status] || 'bg-slate-100 text-slate-700'}`}>{TASK_STATUS_LABELS[selectedTask.status] || selectedTask.status}</span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"><span className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[selectedTask.priority] || 'bg-slate-300'}`} />{PRIORITY_LABELS[selectedTask.priority] || selectedTask.priority}</span>
                {selectedTask.due_date && isOverdue(selectedTask.due_date, selectedTask.status) && <span className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700"><AlertTriangle size={12} />เกินกำหนด</span>}
                {isMyTask(selectedTask) && <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 border border-amber-200"><Star size={10} className="fill-amber-500" />งานของฉัน</span>}
              </div>
              <div className="space-y-2.5 text-sm">
                {selectedTask.start_date && <div className="flex items-center gap-2 text-slate-600"><CalendarDays size={14} className="text-slate-400" /><span>วันเริ่ม: {new Date(selectedTask.start_date).toLocaleDateString('th-TH', { dateStyle: 'long' })}</span></div>}
                {selectedTask.due_date && <div className="flex items-center gap-2 text-slate-600"><Clock size={14} className="text-slate-400" /><span>กำหนดส่ง: {new Date(selectedTask.due_date).toLocaleDateString('th-TH', { dateStyle: 'long' })}</span></div>}
                {(() => { const a = users.find(u => u.id === selectedTask.assigned_to); return (
                  <div className="flex items-center gap-2 text-slate-600">
                    {a ? <UserAvatar name={a.full_name} userId={a.id} size="w-5 h-5 text-[9px]" /> : <span className="text-xs text-slate-400 w-5 text-center">👤</span>}
                    <span>ผู้รับผิดชอบ: {a ? a.full_name : selectedTask.assigned_to_name || 'ยังไม่มอบหมาย'}</span>
                  </div>);})()}
                {selectedTask.description && <div className="mt-3 rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500 mb-1">รายละเอียดงาน</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedTask.description}</p></div>}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4">
              <button onClick={() => setSelectedTask(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">ปิด</button>
              {selectedTask.project_id && <button onClick={() => { setSelectedTask(null); navigate(`/projects/${selectedTask.project_id}`); }} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"><ExternalLink size={14} />ไปที่หน้างาน</button>}
              <button onClick={() => { setSelectedTask(null); navigate('/tasks'); }} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"><Edit2 size={14} />แก้ไข</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

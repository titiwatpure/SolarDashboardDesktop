import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { BarChart3, Download, FileSpreadsheet, PieChart as PieChartIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { reportsAPI, settingsAPI } from '../utils/api';
import { PRIORITY_LABELS, RISK_LEVELS, ROLES, STATUS_LABELS, STEP_LABELS } from '../utils/constants';
import { SARABUN_BASE64 } from '../utils/thaiFont';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#94a3b8'];

const SECTIONS = [
  { id: 'status', label: 'สรุปตามสถานะ' },
  { id: 'size', label: 'สรุปตามขนาด' },
  { id: 'step', label: 'สรุปตามขั้นตอน' },
  { id: 'province', label: 'สรุปตามจังหวัด' },
  { id: 'risk', label: 'รายงานความเสี่ยง' },
  { id: 'leadTime', label: 'ระยะเวลาแต่ละขั้นตอน' },
  { id: 'performance', label: 'ผลงานรายบุคคล' },
  { id: 'tasks', label: 'สรุปงานที่มอบหมาย' },
  { id: 'timeline', label: 'ประวัติความคืบหน้า' },
];

export default function Reports() {
  const [statusData, setStatusData] = useState([]);
  const [sizeData, setSizeData] = useState([]);
  const [provinceData, setProvinceData] = useState([]);
  const [stepData, setStepData] = useState([]);
  const [riskData, setRiskData] = useState([]);
  const [leadTimeData, setLeadTimeData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [tasksData, setTasksData] = useState([]);
  const [tasksByAssignee, setTasksByAssignee] = useState([]);
  const [tasksDetails, setTasksDetails] = useState([]);
  const [timelineData, setTimelineData] = useState([]);
  const [timelineSearch, setTimelineSearch] = useState('');
  const [timelinePage, setTimelinePage] = useState(1);
  const TIMELINE_ROWS = 15;
  const [selectedSections, setSelectedSections] = useState(
    () => new Set(SECTIONS.map((s) => s.id))
  );
  const [logoBase64, setLogoBase64] = useState(null);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    loadReports();
    settingsAPI.getCompany().then((data) => {
      setCompanyName(data.company_name || '');
      if (data.logo_url) {
        fetch(data.logo_url).then(r => r.blob()).then(blob => {
          const reader = new FileReader();
          reader.onload = () => setLogoBase64(reader.result);
          reader.readAsDataURL(blob);
        }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  const loadReports = async () => {
    try {
      const [status, size, province, step, risk, leadTime, performance, tasks, timeline, byAssignee, details] =
        await Promise.all([
          reportsAPI.getSummaryByStatus(),
          reportsAPI.getSummaryBySize(),
          reportsAPI.getSummaryByProvince(),
          reportsAPI.getSummaryByStep(),
          reportsAPI.getSummaryByRisk().catch(() => []),
          reportsAPI.getSummaryByLeadTime().catch(() => []),
          reportsAPI.getSummaryByPerformance().catch(() => []),
          reportsAPI.getSummaryByTasks().catch(() => []),
          reportsAPI.getSummaryByTimeline().catch(() => []),
          reportsAPI.getTasksByAssignee().catch(() => []),
          reportsAPI.getTasksDetails().catch(() => []),
        ]);

      setStatusData(Array.isArray(status) ? status : (status.data || []));
      setSizeData(Array.isArray(size) ? size : (size.data || []));
      setProvinceData(Array.isArray(province) ? province : (province.data || []));
      setStepData(Array.isArray(step) ? step : (step.data || []));
      setRiskData(Array.isArray(risk) ? risk : (risk.data || []));
      setLeadTimeData(Array.isArray(leadTime) ? leadTime : (leadTime.data || []));
      setPerformanceData(Array.isArray(performance) ? performance : (performance.data || []));
      setTasksData(Array.isArray(tasks) ? tasks : (tasks.data || []));
      setTimelineData(Array.isArray(timeline) ? timeline : (timeline.data || []));
      setTasksByAssignee(Array.isArray(byAssignee) ? byAssignee : (byAssignee.data || []));
      setTasksDetails(Array.isArray(details) ? details : (details.data || []));
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  };

  const toggleSection = (id) => {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedSections((prev) =>
      prev.size === SECTIONS.length
        ? new Set()
        : new Set(SECTIONS.map((s) => s.id))
    );
  };

  const filteredTimeline = useMemo(() => {
    if (!timelineSearch.trim()) return timelineData;
    const term = timelineSearch.trim().toLowerCase();
    return timelineData.filter(
      (row) =>
        row.project_name?.toLowerCase().includes(term) ||
        row.project_code?.toLowerCase().includes(term)
    );
  }, [timelineData, timelineSearch]);

  // ---- Excel Export ----
  const handleExportExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();
    const sel = selectedSections;

    if (sel.has('status')) {
      const sheet = XLSX.utils.json_to_sheet(
        statusData.map((r) => ({
          'สถานะ': STATUS_LABELS[r.status] || r.status,
          'จำนวน': r.count,
          'สัดส่วน (%)': Number(r.percentage || 0).toFixed(1),
        }))
      );
      XLSX.utils.book_append_sheet(wb, sheet, 'สรุปตามสถานะ');
    }

    if (sel.has('size')) {
      const sheet = XLSX.utils.json_to_sheet(
        sizeData.map((r) => ({
          'กลุ่มขนาด': r.size_category,
          'จำนวนโครงการ': r.count,
          'ขนาดเฉลี่ย (kW)': r.avg_size,
          'กำลังการผลิตรวม (kW)': r.total_capacity,
        }))
      );
      XLSX.utils.book_append_sheet(wb, sheet, 'สรุปตามขนาด');
    }

    if (sel.has('step')) {
      const sheet = XLSX.utils.json_to_sheet(
        stepData.map((r) => ({
          'ขั้นตอน': STEP_LABELS[r.step] || r.step,
          'จำนวนโครงการ': r.count,
        }))
      );
      XLSX.utils.book_append_sheet(wb, sheet, 'สรุปตามขั้นตอน');
    }

    if (sel.has('province')) {
      const sheet = XLSX.utils.json_to_sheet(
        provinceData.map((r) => ({
          'จังหวัด': r.province,
          'จำนวนโครงการ': r.count,
          'เสร็จแล้ว': r.completed,
          'อัตราความสำเร็จ (%)': r.completion_rate,
        }))
      );
      XLSX.utils.book_append_sheet(wb, sheet, 'สรุปตามจังหวัด');
    }

    if (sel.has('risk')) {
      const sheet = XLSX.utils.json_to_sheet(
        riskData.map((r) => ({
          'ชื่อโครงการ': r.project_name,
          'รหัส': r.project_code,
          'จังหวัด': r.province,
          'ขนาด (kW)': r.size_kw,
          'ระดับเสี่ยง': RISK_LEVELS[r.risk_level]?.label || r.risk_level,
          'สถานะ': STATUS_LABELS[r.status] || r.status,
          'สาเหตุ': r.blocked_reason || '-',
        }))
      );
      XLSX.utils.book_append_sheet(wb, sheet, 'รายงานความเสี่ยง');
    }

    if (sel.has('leadTime')) {
      const sheet = XLSX.utils.json_to_sheet(
        leadTimeData.map((r) => ({
          'ขั้นตอน': STEP_LABELS[r.step] || r.step,
          'จำนวนโครงการ': r.project_count,
          'ระยะเวลาเฉลี่ย (วัน)': r.avg_days,
        }))
      );
      XLSX.utils.book_append_sheet(wb, sheet, 'ระยะเวลาแต่ละขั้นตอน');
    }

    if (sel.has('performance')) {
      const sheet = XLSX.utils.json_to_sheet(
        performanceData.map((r) => ({
          'ชื่อ': r.full_name,
          'บทบาท': ROLES[r.role] || r.role,
          'โครงการทั้งหมด': r.total_projects,
          'เสร็จแล้ว': r.completed,
          'กำลังดำเนินการ': r.in_progress,
          'ติดปัญหา': r.blocked,
          'ความเสี่ยงสูง': r.high_risk,
          'อัตราเสร็จ (%)': r.completion_rate,
        }))
      );
      XLSX.utils.book_append_sheet(wb, sheet, 'ผลงานรายบุคคล');
    }

    if (sel.has('tasks')) {
      const sheet1 = XLSX.utils.json_to_sheet(
        tasksByAssignee.map((r) => ({
          'ผู้รับผิดชอบ': r.assignee_name,
          'บทบาท': ROLES[r.assignee_role] || r.assignee_role || '-',
          'ทั้งหมด': r.total,
          'รอดำเนินการ': r.pending,
          'กำลังทำ': r.in_progress,
          'เสร็จแล้ว': r.completed,
          'ยกเลิก': r.cancelled,
          'เกินกำหนด': r.overdue,
        }))
      );
      XLSX.utils.book_append_sheet(wb, sheet1, 'สรุปตามผู้รับผิดชอบ');

      const sheet2 = XLSX.utils.json_to_sheet(
        tasksDetails.map((r) => ({
          'ความสำคัญ': PRIORITY_LABELS[r.priority] || r.priority,
          'ชื่องาน': r.title,
          'โครงการ': r.project_name || '-',
          'รหัสโครงการ': r.project_code || '-',
          'ผู้รับผิดชอบ': r.assigned_to_name || '-',
          'ครบกำหนด': r.due_date ? new Date(r.due_date).toLocaleDateString('th-TH') : '-',
          'สถานะ': STATUS_LABELS[r.status] || r.status,
          'เสร็จเมื่อ': r.completed_at ? new Date(r.completed_at).toLocaleDateString('th-TH') : '-',
        }))
      );
      XLSX.utils.book_append_sheet(wb, sheet2, 'รายละเอียดงาน');
    }

    if (sel.has('timeline')) {
      const sheet = XLSX.utils.json_to_sheet(
        filteredTimeline.map((r) => ({
          'ชื่อโครงการ': r.project_name,
          'รหัสโครงการ': r.project_code,
          'ขั้นตอน': STEP_LABELS[r.step] || r.step,
          'สถานะ': STATUS_LABELS[r.status] || r.status,
          'หมายเหตุ': r.note || '-',
          'ผู้ดำเนินการ': r.changed_by_name || '-',
          'วันที่': r.created_at ? new Date(r.created_at).toLocaleString('th-TH') : '-',
          'ความเห็น': r.comments || '-',
        }))
      );
      XLSX.utils.book_append_sheet(wb, sheet, 'ประวัติความคืบหน้า');
    }

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `รายงาน Solar Dashboard ${date}.xlsx`);
  }, [selectedSections, statusData, sizeData, stepData, provinceData, riskData, leadTimeData, performanceData, tasksByAssignee, tasksDetails, filteredTimeline]);

  // ---- PDF Export ----
  const handleExportPdf = useCallback(() => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const sel = selectedSections;

    doc.addFileToVFS('Sarabun.ttf', SARABUN_BASE64);
    doc.addFont('Sarabun.ttf', 'Sarabun', 'normal');
    doc.addFont('Sarabun.ttf', 'Sarabun', 'bold');
    doc.addFont('Sarabun.ttf', 'Sarabun', 'italic');
    doc.addFont('Sarabun.ttf', 'Sarabun', 'bolditalic');
    doc.setFont('Sarabun');

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    if (logoBase64) {
      try { doc.addImage(logoBase64, 'PNG', 14, 8, 14, 14); } catch {}
    }

    doc.setFontSize(16);
    const titleX = logoBase64 ? 30 : pageWidth / 2;
    const titleAlign = logoBase64 ? 'left' : 'center';
    if (companyName) {
      doc.setFontSize(9);
      doc.setTextColor(0);
      doc.text(companyName, titleX, y - 2, { align: titleAlign });
    }
    doc.setFontSize(16);
    doc.text('รายงาน Solar Dashboard', titleX, y + 4, { align: titleAlign });
    y += 10;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
      titleX,
      y,
      { align: titleAlign }
    );
    doc.setTextColor(0);
    y += 8;

    const addSection = (title, headers, rows) => {
      if (y > 230) {
        doc.addPage();
        y = 15;
      }
      doc.setFontSize(12);
      doc.text(title, 14, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [headers],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
        styles: { font: 'Sarabun', fontSize: 9 },
        didParseCell: (data) => { data.cell.styles.font = 'Sarabun'; },
      });
      y = doc.lastAutoTable.finalY + 10;
    };

    if (sel.has('status')) {
      addSection(
        'สรุปตามสถานะ',
        ['สถานะ', 'จำนวน', 'สัดส่วน (%)'],
        statusData.map((r) => [
          STATUS_LABELS[r.status] || r.status,
          String(r.count),
          Number(r.percentage || 0).toFixed(1) + '%',
        ])
      );
    }

    if (sel.has('size')) {
      addSection(
        'สรุปตามขนาดโครงการ',
        ['กลุ่มขนาด', 'จำนวน', 'เฉลี่ย (kW)', 'รวม (kW)'],
        sizeData.map((r) => [r.size_category, String(r.count), String(r.avg_size), String(r.total_capacity)])
      );
    }

    if (sel.has('step')) {
      addSection(
        'สรุปตามขั้นตอน',
        ['ขั้นตอน', 'จำนวนโครงการ'],
        stepData.map((r) => [STEP_LABELS[r.step] || r.step, String(r.count)])
      );
    }

    if (sel.has('province')) {
      addSection(
        'สรุปตามจังหวัด',
        ['จังหวัด', 'จำนวน', 'เสร็จแล้ว', 'อัตราสำเร็จ'],
        provinceData.map((r) => [r.province, String(r.count), String(r.completed), r.completion_rate + '%'])
      );
    }

    if (sel.has('risk')) {
      addSection(
        'รายงานความเสี่ยง',
        ['ชื่อโครงการ', 'จังหวัด', 'ระดับเสี่ยง', 'สถานะ', 'สาเหตุ'],
        riskData.map((r) => [
          r.project_name,
          r.province,
          RISK_LEVELS[r.risk_level]?.label || r.risk_level,
          STATUS_LABELS[r.status] || r.status,
          r.blocked_reason || '-',
        ])
      );
    }

    if (sel.has('leadTime')) {
      addSection(
        'ระยะเวลาแต่ละขั้นตอน',
        ['ขั้นตอน', 'จำนวนโครงการ', 'เฉลี่ย (วัน)'],
        leadTimeData.map((r) => [
          STEP_LABELS[r.step] || r.step,
          String(r.project_count),
          String(r.avg_days),
        ])
      );
    }

    if (sel.has('performance')) {
      addSection(
        'ผลงานรายบุคคล',
        ['ชื่อ', 'บทบาท', 'ทั้งหมด', 'เสร็จแล้ว', 'ติดปัญหา', 'อัตราเสร็จ'],
        performanceData.map((r) => [
          r.full_name,
          ROLES[r.role] || r.role,
          String(r.total_projects),
          String(r.completed),
          String(r.blocked),
          r.completion_rate + '%',
        ])
      );
    }

    if (sel.has('tasks')) {
      addSection(
        'สรุปงานตามผู้รับผิดชอบ',
        ['ผู้รับผิดชอบ', 'บทบาท', 'ทั้งหมด', 'รอดำเนินการ', 'กำลังทำ', 'เสร็จแล้ว', 'เกินกำหนด'],
        tasksByAssignee.map((r) => [
          r.assignee_name,
          ROLES[r.assignee_role] || r.assignee_role || '-',
          String(r.total),
          String(r.pending),
          String(r.in_progress),
          String(r.completed),
          String(r.overdue),
        ])
      );
      addSection(
        'รายละเอียดงานทั้งหมด',
        ['ความสำคัญ', 'ชื่องาน', 'โครงการ', 'ผู้รับผิดชอบ', 'ครบกำหนด', 'สถานะ'],
        tasksDetails.map((r) => [
          PRIORITY_LABELS[r.priority] || r.priority,
          r.title,
          r.project_name || '-',
          r.assigned_to_name || '-',
          r.due_date ? new Date(r.due_date).toLocaleDateString('th-TH') : '-',
          STATUS_LABELS[r.status] || r.status,
        ])
      );
    }

    if (sel.has('timeline')) {
      addSection(
        'ประวัติความคืบหน้า',
        ['โครงการ', 'ขั้นตอน', 'สถานะ', 'ผู้ดำเนินการ', 'วันที่', 'หมายเหตุ'],
        filteredTimeline.map((r) => [
          r.project_name,
          STEP_LABELS[r.step] || r.step,
          STATUS_LABELS[r.status] || r.status,
          r.changed_by_name || '-',
          r.created_at ? new Date(r.created_at).toLocaleString('th-TH') : '-',
          r.note || '-',
        ])
      );
    }

    doc.save(`รายงาน Solar Dashboard ${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [selectedSections, statusData, sizeData, stepData, provinceData, riskData, leadTimeData, performanceData, tasksByAssignee, tasksDetails, filteredTimeline, logoBase64, companyName]);

  // ---- Chart data ----
  const pieData = useMemo(
    () =>
      statusData.map((item) => ({
        ...item,
        name: STATUS_LABELS[item.status] || item.status,
        percentage: Number(item.percentage || 0).toFixed(1),
      })),
    [statusData]
  );

  const stepChartData = useMemo(
    () =>
      stepData.map((item) => ({
        ...item,
        step_label: STEP_LABELS[item.step] || item.step,
      })),
    [stepData]
  );

  const leadTimeChartData = useMemo(
    () =>
      leadTimeData.map((item) => ({
        ...item,
        step_label: STEP_LABELS[item.step] || item.step,
      })),
    [leadTimeData]
  );

  const totalProjects = useMemo(
    () => pieData.reduce((sum, item) => sum + Number(item.count || 0), 0),
    [pieData]
  );

  const sel = selectedSections;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <BarChart3 size={22} />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">รายงานและสรุปผล</h1>
              <p className="mt-2 max-w-2xl text-base text-slate-500">
                เลือกหัวข้อรายงานที่ต้องการ แล้วส่งออกเป็น Excel หรือ PDF
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportExcel}
              disabled={selectedSections.size === 0}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={18} />
              ส่งออก Excel
            </button>
            <button
              onClick={handleExportPdf}
              disabled={selectedSections.size === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              ส่งออก PDF
            </button>
          </div>
        </div>

        {/* Checkbox filter */}
        <div className="mt-5 border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700">เลือกหัวข้อที่ต้องการส่งออก</p>
            <button
              onClick={toggleAll}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {sel.size === SECTIONS.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SECTIONS.map((section) => (
              <label
                key={section.id}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={sel.has(section.id)}
                  onChange={() => toggleSection(section.id)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {section.label}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* สรุปตามสถานะ + ขนาด */}
      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        {sel.has('status') && (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <PieChartIcon size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">สรุปตามสถานะ</h2>
                <p className="text-sm text-slate-500">สัดส่วนโครงการทั้งหมดแยกตามสถานะการดำเนินงาน</p>
              </div>
            </div>
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="h-72 w-full xl:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={78}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="count"
                      strokeWidth={0}
                    >
                      {pieData.map((item, index) => (
                        <Cell key={item.status} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="-mt-44 text-center">
                  <p className="text-4xl font-bold text-slate-900">{totalProjects}</p>
                  <p className="text-sm text-slate-500">โครงการทั้งหมด</p>
                </div>
              </div>
              <div className="space-y-3">
                {pieData.map((item, index) => (
                  <div key={item.status} className="flex items-center justify-between gap-6 text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      {item.name}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {item.percentage}% ({item.count})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {sel.has('size') && (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">สรุปตามขนาดโครงการ</h2>
              <p className="mt-1 text-sm text-slate-500">เปรียบเทียบจำนวนและกำลังการผลิตรวมตามกลุ่มขนาด</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sizeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="size_category" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" radius={[10, 10, 0, 0]} name="จำนวนโครงการ" />
                  <Bar dataKey="total_capacity" fill="#10b981" radius={[10, 10, 0, 0]} name="กำลังการผลิตรวม (kW)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {/* สรุปตามขั้นตอน + จังหวัด */}
      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        {sel.has('step') && (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">สรุปตามขั้นตอน</h2>
              <p className="mt-1 text-sm text-slate-500">จำนวนโครงการที่อยู่ในแต่ละขั้นตอนของ workflow</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stepChartData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="step_label"
                    width={90}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 10, 10, 0]} name="จำนวนโครงการ" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {sel.has('province') && (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">จังหวัดที่มีโครงการมากที่สุด</h2>
              <p className="mt-1 text-sm text-slate-500">แสดงจังหวัดหลักพร้อมอัตราการดำเนินงานสำเร็จ</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-5 py-4 text-left font-semibold">จังหวัด</th>
                    <th className="px-5 py-4 text-left font-semibold">จำนวน</th>
                    <th className="px-5 py-4 text-left font-semibold">เสร็จแล้ว</th>
                    <th className="px-5 py-4 text-left font-semibold">อัตราความสำเร็จ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {provinceData.slice(0, 10).map((row) => (
                    <tr key={row.province} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4 font-medium text-slate-900">{row.province}</td>
                      <td className="px-5 py-4 text-slate-700">{row.count}</td>
                      <td className="px-5 py-4 text-slate-700">{row.completed}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 w-28 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${row.completion_rate}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-700">{row.completion_rate}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ความเสี่ยง + ระยะเวลา */}
      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        {sel.has('risk') && (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">รายงานความเสี่ยง</h2>
              <p className="mt-1 text-sm text-slate-500">โครงการที่มีความเสี่ยงสูง/วิกฤต หรือติดปัญหา</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">โครงการ</th>
                    <th className="px-4 py-3 text-left font-semibold">จังหวัด</th>
                    <th className="px-4 py-3 text-left font-semibold">เสี่ยง</th>
                    <th className="px-4 py-3 text-left font-semibold">สถานะ</th>
                    <th className="px-4 py-3 text-left font-semibold">สาเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {riskData.slice(0, 10).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.project_name}</td>
                      <td className="px-4 py-3 text-slate-700">{row.province}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${RISK_LEVELS[row.risk_level]?.color || 'bg-gray-100 text-gray-800'}`}>
                          {RISK_LEVELS[row.risk_level]?.label || row.risk_level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{STATUS_LABELS[row.status] || row.status}</td>
                      <td className="px-4 py-3 text-slate-500">{row.blocked_reason || '-'}</td>
                    </tr>
                  ))}
                  {riskData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">ไม่มีโครงการที่มีความเสี่ยง</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {sel.has('leadTime') && (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">ระยะเวลาแต่ละขั้นตอน</h2>
              <p className="mt-1 text-sm text-slate-500">ระยะเวลาเฉลี่ย (วัน) ที่ใช้ในแต่ละขั้นตอน</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadTimeChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="step_label" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} label={{ value: 'วัน', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Bar dataKey="avg_days" fill="#8b5cf6" radius={[10, 10, 0, 0]} name="เฉลี่ย (วัน)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {/* ผลงานรายบุคคล + สรุปงาน */}
      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        {sel.has('performance') && (
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-900">ผลงานรายบุคคล</h2>
              <p className="mt-1 text-sm text-slate-500">สรุปจำนวนโครงการและอัตราเสร็จสิ้นต่อบุคคล</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50 text-sm text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">ชื่อ</th>
                    <th className="px-4 py-3 text-left font-semibold">บทบาท</th>
                    <th className="px-4 py-3 text-center font-semibold">ทั้งหมด</th>
                    <th className="px-4 py-3 text-center font-semibold">เสร็จ</th>
                    <th className="px-4 py-3 text-center font-semibold">ติดปัญหา</th>
                    <th className="px-4 py-3 text-left font-semibold">อัตราเสร็จ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {performanceData.map((row) => (
                    <tr key={row.user_id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.full_name}</td>
                      <td className="px-4 py-3 text-slate-700">{ROLES[row.role] || row.role}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{row.total_projects}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{row.completed}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{row.blocked}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{ width: `${row.completion_rate || 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700">{row.completion_rate || 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {performanceData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">ไม่มีข้อมูล</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {sel.has('tasks') && (
          <>
            {/* Summary by assignee */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">สรุปงานตามผู้รับผิดชอบ</h2>
                <p className="mt-1 text-sm text-slate-500">จำนวนงานแยกตามผู้รับผิดชอบและสถานะ</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 text-sm text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">ผู้รับผิดชอบ</th>
                      <th className="px-4 py-3 text-center font-semibold">ทั้งหมด</th>
                      <th className="px-4 py-3 text-center font-semibold">รอดำเนินการ</th>
                      <th className="px-4 py-3 text-center font-semibold">กำลังทำ</th>
                      <th className="px-4 py-3 text-center font-semibold">เสร็จแล้ว</th>
                      <th className="px-4 py-3 text-center font-semibold">เกินกำหนด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {tasksByAssignee.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {row.assignee_name}
                          {row.assignee_role && (
                            <span className="ml-2 text-xs text-slate-400">({ROLES[row.assignee_role] || row.assignee_role})</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-700">{row.total}</td>
                        <td className="px-4 py-3 text-center text-slate-700">{row.pending}</td>
                        <td className="px-4 py-3 text-center text-slate-700">{row.in_progress}</td>
                        <td className="px-4 py-3 text-center text-slate-700">{row.completed}</td>
                        <td className="px-4 py-3 text-center">
                          {row.overdue > 0 ? (
                            <span className="inline-block rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                              {row.overdue}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {tasksByAssignee.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">ไม่มีข้อมูล</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed task list */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-900">รายละเอียดงานทั้งหมด</h2>
                <p className="mt-1 text-sm text-slate-500">รายการงานทั้งหมด {tasksDetails.length} งาน</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 text-sm text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">ความสำคัญ</th>
                      <th className="px-4 py-3 text-left font-semibold">ชื่องาน</th>
                      <th className="px-4 py-3 text-left font-semibold">โครงการ</th>
                      <th className="px-4 py-3 text-left font-semibold">ผู้รับผิดชอบ</th>
                      <th className="px-4 py-3 text-left font-semibold">ครบกำหนด</th>
                      <th className="px-4 py-3 text-left font-semibold">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {tasksDetails.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                            row.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            row.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            row.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {PRIORITY_LABELS[row.priority] || row.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px] truncate" title={row.title}>{row.title}</td>
                        <td className="px-4 py-3 text-slate-700">{row.project_code || '-'}</td>
                        <td className="px-4 py-3 text-slate-700">{row.assigned_to_name || '-'}</td>
                        <td className="px-4 py-3 text-slate-600">{row.due_date ? new Date(row.due_date).toLocaleDateString('th-TH') : '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                            row.status === 'completed' ? 'bg-green-100 text-green-800' :
                            row.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            row.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {STATUS_LABELS[row.status] || row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {tasksDetails.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">ไม่มีข้อมูล</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ประวัติความคืบหน้า */}
      {sel.has('timeline') && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">ประวัติความคืบหน้า</h2>
              <p className="mt-1 text-sm text-slate-500">บันทึกการเปลี่ยนแปลงสถานะและขั้นตอน</p>
            </div>
            <div className="w-full sm:w-72">
              <input
                type="text"
                value={timelineSearch}
                onChange={(e) => { setTimelineSearch(e.target.value); setTimelinePage(1); }}
                placeholder="ค้นหาชื่อหรือรหัสโครงการ..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-400"
              />
              <p className="mt-1 text-xs text-slate-400">
                {timelineSearch.trim()
                  ? `พบ ${filteredTimeline.length} รายการ จากทั้งหมด ${timelineData.length} รายการ`
                  : `ทั้งหมด ${timelineData.length} รายการ`}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 text-sm text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">โครงการ</th>
                  <th className="px-4 py-3 text-left font-semibold">ขั้นตอน</th>
                  <th className="px-4 py-3 text-left font-semibold">สถานะ</th>
                  <th className="px-4 py-3 text-left font-semibold">ผู้ดำเนินการ</th>
                  <th className="px-4 py-3 text-left font-semibold">วันที่</th>
                  <th className="px-4 py-3 text-left font-semibold">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTimeline
                  .slice((timelinePage - 1) * TIMELINE_ROWS, timelinePage * TIMELINE_ROWS)
                  .map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900">{row.project_name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
                          {STEP_LABELS[row.step] || row.step}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{STATUS_LABELS[row.status] || row.status}</td>
                      <td className="px-4 py-3 text-slate-700">{row.changed_by_name || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.created_at ? new Date(row.created_at).toLocaleString('th-TH') : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[250px] truncate" title={row.note || ''}>
                        {row.note || '-'}
                      </td>
                    </tr>
                  ))}
                {filteredTimeline.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      {timelineSearch.trim() ? 'ไม่พบโครงการที่ค้นหา' : 'ไม่มีข้อมูล'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredTimeline.length > TIMELINE_ROWS && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                แสดง {(timelinePage - 1) * TIMELINE_ROWS + 1}–{Math.min(timelinePage * TIMELINE_ROWS, filteredTimeline.length)} จาก {filteredTimeline.length} รายการ
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setTimelinePage((p) => Math.max(1, p - 1))}
                  disabled={timelinePage === 1}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ก่อนหน้า
                </button>
                {Array.from({ length: Math.ceil(filteredTimeline.length / TIMELINE_ROWS) }, (_, i) => i + 1)
                  .filter((p) => {
                    const total = Math.ceil(filteredTimeline.length / TIMELINE_ROWS);
                    if (total <= 5) return true;
                    if (p === 1 || p === total) return true;
                    return Math.abs(p - timelinePage) <= 1;
                  })
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === '...' ? (
                      <span key={`dots-${i}`} className="px-2 py-1.5 text-sm text-slate-400">...</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setTimelinePage(item)}
                        className={`min-w-[36px] rounded-lg px-3 py-1.5 text-sm font-medium ${
                          timelinePage === item
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setTimelinePage((p) => Math.min(Math.ceil(filteredTimeline.length / TIMELINE_ROWS), p + 1))}
                  disabled={timelinePage === Math.ceil(filteredTimeline.length / TIMELINE_ROWS)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

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
import { reportsAPI } from '../utils/api';
import { STATUS_LABELS, STEP_LABELS } from '../utils/constants';
import { SARABUN_BASE64 } from '../utils/thaiFont';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#94a3b8'];

export default function Reports() {
  const [statusData, setStatusData] = useState([]);
  const [sizeData, setSizeData] = useState([]);
  const [provinceData, setProvinceData] = useState([]);
  const [stepData, setStepData] = useState([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const [status, size, province, step] = await Promise.all([
        reportsAPI.getSummaryByStatus(),
        reportsAPI.getSummaryBySize(),
        reportsAPI.getSummaryByProvince(),
        reportsAPI.getSummaryByStep()
      ]);

      setStatusData(Array.isArray(status) ? status : (status.data || []));
      setSizeData(Array.isArray(size) ? size : (size.data || []));
      setProvinceData(Array.isArray(province) ? province : (province.data || []));
      setStepData(Array.isArray(step) ? step : (step.data || []));
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  };

  const handleExportExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: สรุปตามสถานะ
    const statusSheet = XLSX.utils.json_to_sheet(
      statusData.map(r => ({
        'สถานะ': STATUS_LABELS[r.status] || r.status,
        'จำนวน': r.count,
        'สัดส่วน (%)': Number(r.percentage || 0).toFixed(1)
      }))
    );
    XLSX.utils.book_append_sheet(wb, statusSheet, 'สรุปตามสถานะ');

    // Sheet 2: สรุปตามขนาด
    const sizeSheet = XLSX.utils.json_to_sheet(
      sizeData.map(r => ({
        'กลุ่มขนาด': r.size_category,
        'จำนวนโครงการ': r.count,
        'ขนาดเฉลี่ย (kW)': r.avg_size,
        'กำลังการผลิตรวม (kW)': r.total_capacity
      }))
    );
    XLSX.utils.book_append_sheet(wb, sizeSheet, 'สรุปตามขนาด');

    // Sheet 3: สรุปตามขั้นตอน
    const stepSheet = XLSX.utils.json_to_sheet(
      stepData.map(r => ({
        'ขั้นตอน': STEP_LABELS[r.step] || r.step,
        'จำนวนโครงการ': r.count
      }))
    );
    XLSX.utils.book_append_sheet(wb, stepSheet, 'สรุปตามขั้นตอน');

    // Sheet 4: สรุปตามจังหวัด
    const provinceSheet = XLSX.utils.json_to_sheet(
      provinceData.map(r => ({
        'จังหวัด': r.province,
        'จำนวนโครงการ': r.count,
        'เสร็จแล้ว': r.completed,
        'อัตราความสำเร็จ (%)': r.completion_rate
      }))
    );
    XLSX.utils.book_append_sheet(wb, provinceSheet, 'สรุปตามจังหวัด');

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `รายงาน Solar Dashboard ${date}.xlsx`);
  }, [statusData, sizeData, stepData, provinceData]);

  const handleExportPdf = useCallback(() => {
    const doc = new jsPDF('p', 'mm', 'a4');

    // เพิ่มฟอนต์ภาษาไทย
    doc.addFileToVFS('Sarabun.ttf', SARABUN_BASE64);
    doc.addFont('Sarabun.ttf', 'Sarabun', 'normal');
    doc.setFont('Sarabun');

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // หัวเรื่อง
    doc.setFontSize(16);
    doc.text('รายงาน Solar Dashboard', pageWidth / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth / 2, y, { align: 'center' });
    doc.setTextColor(0);
    y += 8;

    // ตาราง 1: สรุปตามสถานะ
    doc.setFontSize(12);
    doc.text('สรุปตามสถานะ', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['สถานะ', 'จำนวน', 'สัดส่วน (%)']],
      body: statusData.map(r => [
        STATUS_LABELS[r.status] || r.status,
        String(r.count),
        Number(r.percentage || 0).toFixed(1) + '%'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { font: 'Sarabun', fontSize: 9 }
    });
    y = doc.lastAutoTable.finalY + 10;

    // ตาราง 2: สรุปตามขนาด
    doc.setFontSize(12);
    doc.text('สรุปตามขนาดโครงการ', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['กลุ่มขนาด', 'จำนวน', 'เฉลี่ย (kW)', 'รวม (kW)']],
      body: sizeData.map(r => [
        r.size_category,
        String(r.count),
        String(r.avg_size),
        String(r.total_capacity)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { font: 'Sarabun', fontSize: 9 }
    });
    y = doc.lastAutoTable.finalY + 10;

    // ตาราง 3: สรุปตามขั้นตอน
    doc.setFontSize(12);
    doc.text('สรุปตามขั้นตอน', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['ขั้นตอน', 'จำนวนโครงการ']],
      body: stepData.map(r => [
        STEP_LABELS[r.step] || r.step,
        String(r.count)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { font: 'Sarabun', fontSize: 9 }
    });
    y = doc.lastAutoTable.finalY + 10;

    if (y > 230) { doc.addPage(); y = 15; }

    // ตาราง 4: สรุปตามจังหวัด
    doc.setFontSize(12);
    doc.text('สรุปตามจังหวัด', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['จังหวัด', 'จำนวน', 'เสร็จแล้ว', 'อัตราสำเร็จ']],
      body: provinceData.map(r => [
        r.province,
        String(r.count),
        String(r.completed),
        r.completion_rate + '%'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { font: 'Sarabun', fontSize: 9 }
    });

    doc.save(`รายงาน Solar Dashboard ${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [statusData, sizeData, stepData, provinceData]);

  const pieData = useMemo(
    () =>
      statusData.map((item) => ({
        ...item,
        name: STATUS_LABELS[item.status] || item.status,
        percentage: Number(item.percentage || 0).toFixed(1)
      })),
    [statusData]
  );

  const stepChartData = useMemo(
    () =>
      stepData.map((item) => ({
        ...item,
        step_label: STEP_LABELS[item.step] || item.step
      })),
    [stepData]
  );

  const totalProjects = useMemo(
    () => pieData.reduce((sum, item) => sum + Number(item.count || 0), 0),
    [pieData]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <BarChart3 size={22} />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">รายงานและสรุปผล</h1>
              <p className="mt-2 max-w-2xl text-base text-slate-500">
                สรุปข้อมูลเชิงบริหารจากสถานะ ขนาด จังหวัด และขั้นตอนของโครงการ เพื่อช่วยตัดสินใจได้เร็วขึ้น
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportExcel}
              disabled={statusData.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={18} />
              Export Excel
            </button>
            <button
              onClick={handleExportPdf}
              disabled={statusData.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              Export PDF
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
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
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
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
      </section>
    </div>
  );
}

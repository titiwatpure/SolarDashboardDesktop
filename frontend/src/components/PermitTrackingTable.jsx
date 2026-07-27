import { useState, useEffect } from 'react';
import { permitTrackingAPI } from '../utils/api';

export default function PermitTrackingTable() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await permitTrackingAPI.getAll();
      setData(result.data || []);
    } catch (error) {
      console.error('Failed to load permit tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = data.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.project_code?.toLowerCase().includes(q) || 
           p.project_name?.toLowerCase().includes(q);
  });

  const getStatusColor = (status) => {
    const colors = {
      'Done': 'bg-emerald-100 text-emerald-700',
      'N/A': 'bg-slate-100 text-slate-500',
      'รอดำเนินการ': 'bg-amber-100 text-amber-700',
      'รอผล ERC': 'bg-blue-100 text-blue-700',
      'On Process': 'bg-blue-100 text-blue-700',
      'ส่งแล้ว': 'bg-purple-100 text-purple-700',
      'อยู่ระหว่างแก้ไข': 'bg-orange-100 text-orange-700',
      'ไม่ผ่าน': 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-600';
  };

  const handleExport = () => {
    const headers = ['Priority', 'Project', 'Name', 'Capacity (kWp)', 'CoP', 'ESA', 'Act./DEAT', 'Ring/DEAT', 'ERC', 'DEDE', 'PEA'];
    const rows = filtered.map(p => [
      p.priority,
      p.project_code,
      p.project_name,
      p.size_kw,
      p.cop,
      p.esa,
      p.act_deat,
      p.ring_deat,
      p.erc,
      p.dede,
      p.pea
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PermitTracking_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">สถานะใบอนุญาตแต่ละโครงการ</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาโครงการ..."
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
          />
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-slate-500">#</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500">Project</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500">Name</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500">Capacity</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500">CoP</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500">ESA</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500">Act./DEAT</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500">Ring/DEAT</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500">ERC</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500">DEDE</th>
                <th className="px-3 py-3 text-left font-semibold text-slate-500">PEA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.project_code} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-500">{p.priority}</td>
                  <td className="px-3 py-2 font-medium text-blue-600">{p.project_code}</td>
                  <td className="px-3 py-2 text-slate-700">{p.project_name}</td>
                  <td className="px-3 py-2 text-slate-700">{p.size_kw}</td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(p.cop)}`}>{p.cop}</span></td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(p.esa)}`}>{p.esa}</span></td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(p.act_deat)}`}>{p.act_deat}</span></td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(p.ring_deat)}`}>{p.ring_deat}</span></td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(p.erc)}`}>{p.erc}</span></td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(p.dede)}`}>{p.dede}</span></td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(p.pea)}`}>{p.pea}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentReviewAPI } from '../utils/api';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  revision_requested: 'bg-red-100 text-red-700',
  resubmitted: 'bg-blue-100 text-blue-700',
};

const STATUS_LABELS = {
  pending: 'รอตรวจสอบ',
  approved: 'อนุมัติแล้ว',
  revision_requested: 'ให้แก้ไข',
  resubmitted: 'ยื่นใหม่แล้ว',
};

const STATUS_STYLES = {
  approved: 'border-emerald-500 bg-emerald-50',
  revision_requested: 'border-red-500 bg-red-50',
  resubmitted: 'border-blue-500 bg-blue-50',
};

export default function DocReviewAgencyTracking() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [editSub, setEditSub] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await documentReviewAPI.getAllSubmissions();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubmission = async (subId, data) => {
    try {
      await documentReviewAPI.updateSubmission(subId, data);
      loadData();
      setEditSub(null);
    } catch (e) {
      console.error('Failed to update submission:', e);
      alert('อัปเดตไม่สำเร็จ');
    }
  };

  const handleDeleteSubmission = async (submissionId, agencyName, round) => {
    // eslint-disable-next-line no-restricted-globals
    if (!window.confirm(`ต้องการลบรายการยื่น "${agencyName} รอบที่ ${round}" หรือไม่?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) return;
    try {
      await documentReviewAPI.deleteSubmission(submissionId);
      loadData();
    } catch (error) {
      console.error('Failed to delete submission:', error);
      alert('ลบไม่สำเร็จ');
    }
  };

  const filtered = filterStatus ? submissions.filter(s => s.agency_status === filterStatus) : submissions;

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-slate-400">กำลังโหลด...</p></div>;

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">ติดตามการยื่นหน่วยงาน</h1>
            <p className="text-slate-500 mt-1">ดูประวัติการยื่นทั้งหมด ({submissions.length} รายการ)</p>
          </div>
          <button onClick={() => navigate('/doc-review')} className="text-sm text-blue-600 hover:text-blue-700">← กลับ Dashboard</button>
        </div>
      </section>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterStatus('')} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filterStatus === '' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          ทั้งหมด ({submissions.length})
        </button>
        {Object.entries(STATUS_LABELS).map(([val, label]) => (
          <button key={val} onClick={() => setFilterStatus(val)} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filterStatus === val ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {label} ({submissions.filter(s => s.agency_status === val).length})
          </button>
        ))}
      </div>

      {/* Submissions Table */}
      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-sm text-slate-500">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">โครงการ</th>
                <th className="px-6 py-4 text-left font-semibold">ชุดเอกสาร</th>
                <th className="px-6 py-4 text-left font-semibold">หน่วยงาน</th>
                <th className="px-6 py-4 text-center font-semibold">รอบที่ยื่น</th>
                <th className="px-6 py-4 text-left font-semibold">วันที่ยื่น</th>
                <th className="px-6 py-4 text-left font-semibold">สถานะ</th>
                <th className="px-6 py-4 text-left font-semibold">คอมเมนต์หน่วยงาน</th>
                <th className="px-6 py-4 text-left font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-slate-400">ยังไม่มีประวัติการยื่นหน่วยงาน</td></tr>
              ) : filtered.map(sub => (
                <tr key={sub.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 cursor-pointer" onClick={() => navigate(`/doc-review/${sub.project_id}`)}>
                    <p className="font-medium text-blue-600">{sub.project_code}</p>
                    <p className="text-xs text-slate-500">{sub.project_name}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-700">{sub.package_name || '-'}</td>
                  <td className="px-6 py-4 text-slate-700">{sub.agency_name}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-semibold">รอบ {sub.submission_round}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{sub.submitted_date || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[sub.agency_status] || 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_LABELS[sub.agency_status] || sub.agency_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 text-xs max-w-[200px] truncate">{sub.agency_comment || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {sub.agency_status === 'pending' && (
                        <button onClick={() => setEditSub(sub)} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-700">
                          บันทึกผล
                        </button>
                      )}
                      {sub.agency_status === 'revision_requested' && (
                        <button onClick={() => navigate(`/doc-review/${sub.project_id}`)} className="px-3 py-1.5 rounded-lg bg-blue-600 text-xs font-medium text-white hover:bg-blue-700">
                          ไปแก้ไข
                        </button>
                      )}
                      {sub.agency_status === 'approved' && (
                        <span className="text-xs text-emerald-600 font-medium">เสร็จสิ้น</span>
                      )}
                       <button onClick={(e) => { e.stopPropagation(); handleDeleteSubmission(sub.id, sub.agency_name, sub.submission_round); }} className="px-2 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition" title="ลบรายการยื่น">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                       </button>
                     </div>
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editSub && (
        <UpdateSubmissionModal
          submission={editSub}
          onUpdated={handleUpdateSubmission}
          onClose={() => setEditSub(null)}
        />
      )}
    </div>
  );
}

function UpdateSubmissionModal({ submission, onUpdated, onClose }) {
  const [status, setStatus] = useState('revision_requested');
  const [comment, setComment] = useState(submission.agency_comment || '');
  const [responseDate, setResponseDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onUpdated(submission.id, {
      agency_status: status,
      agency_comment: comment,
      response_date: responseDate,
    });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg m-4">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">บันทึกผลจากหน่วยงาน</h2>
          <p className="text-sm text-slate-500 mt-1">{submission.project_code} | {submission.agency_name} | รอบที่ {submission.submission_round}</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">ผลการตรวจสอบจากหน่วยงาน</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: 'approved', label: 'อนุมัติ' },
                { val: 'revision_requested', label: 'ให้แก้ไข' },
                { val: 'resubmitted', label: 'ยื่นใหม่แล้ว' },
              ].map(({ val, label }) => (
                <label key={val} className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ${status === val ? STATUS_STYLES[val] : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="status" value={val} checked={status === val} onChange={(e) => setStatus(e.target.value)} className="hidden" />
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">คอมเมนต์จากหน่วยงาน</label>
            <textarea rows="3" value={comment} onChange={(e) => setComment(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm resize-none" placeholder="กรอกคอมเมนต์จากหน่วยงาน..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">วันที่ได้รับคำตอบ</label>
            <input type="date" value={responseDate} onChange={(e) => setResponseDate(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm" />
          </div>
          {status === 'revision_requested' && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-700">หลังบันทึก ให้ไปที่หน้าโครงการเพื่อสร้าง Issue จากคอมเมนต์หน่วยงาน แล้วส่งกลับลูกค้า/ทีมแก้ไข</p>
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600">ยกเลิก</button>
            <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {submitting ? 'กำลังบันทึก...' : 'บันทึกผล'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

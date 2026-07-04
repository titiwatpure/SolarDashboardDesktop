import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentReviewAPI } from '../utils/api';
import VirtualizedTable from '../components/VirtualizedTable';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  revision_requested: 'bg-red-100 text-red-700',
  resubmitted: 'bg-blue-100 text-blue-700',
};

const STATUS_STYLES = {
  approved: 'border-emerald-500 bg-emerald-50',
  revision_requested: 'border-red-500 bg-red-50',
  resubmitted: 'border-blue-500 bg-blue-50',
};

const STATUS_LABELS = {
  pending: 'รอตรวจสอบ',
  approved: 'อนุมัติแล้ว',
  revision_requested: 'ให้แก้ไข',
  resubmitted: 'ยื่นใหม่แล้ว',
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
      const projList = await documentReviewAPI.getReviewProjects();
      const projArray = Array.isArray(projList) ? projList : [];
      const allSubs = [];
      for (const p of projArray) {
        try {
          const subs = await documentReviewAPI.getProjectSubmissions(p.id);
          if (Array.isArray(subs)) {
            subs.forEach(s => { allSubs.push({ ...s, project_code: p.project_code, project_name: p.project_name }); });
          }
        } catch (e) { /* skip */ }
      }
      setSubmissions(allSubs);
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
        {filtered.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400">ยังไม่มีประวัติการยื่นหน่วยงาน</div>
        ) : (
          <VirtualizedTable
            maxHeight={600}
            rowHeight={64}
            headers={[
              { label: 'โครงการ', className: 'w-[22%]' },
              { label: 'หน่วยงาน', className: 'w-[15%]' },
              { label: 'รอบที่ยื่น', className: 'w-[10%] text-center' },
              { label: 'วันที่ยื่น', className: 'w-[12%]' },
              { label: 'สถานะ', className: 'w-[12%]' },
              { label: 'คอมเมนต์หน่วยงาน', className: 'w-[19%]' },
              { label: 'จัดการ', className: 'w-[10%]' },
            ]}
            rows={filtered}
            renderRow={(sub) => (
              <div className="flex items-center text-sm border-b border-slate-100 hover:bg-slate-50">
                <div className="px-6 py-4 cursor-pointer w-[22%]" onClick={() => navigate(`/doc-review/${sub.project_id}`)}>
                  <p className="font-medium text-blue-600">{sub.project_code}</p>
                  <p className="text-xs text-slate-500">{sub.project_name}</p>
                </div>
                <div className="px-6 py-4 text-slate-700 w-[15%]">{sub.agency_name}</div>
                <div className="px-6 py-4 text-center w-[10%]">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-semibold">รอบ {sub.submission_round}</span>
                </div>
                <div className="px-6 py-4 text-slate-600 w-[12%]">{sub.submitted_date || '-'}</div>
                <div className="px-6 py-4 w-[12%]">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[sub.agency_status] || 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABELS[sub.agency_status] || sub.agency_status}
                  </span>
                </div>
                <div className="px-6 py-4 text-slate-600 text-xs truncate w-[19%]">{sub.agency_comment || '-'}</div>
                <div className="px-6 py-4 w-[10%]">
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
                </div>
              </div>
            )}
          />
        )}
      </section>

      {/* Update Submission Modal */}
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

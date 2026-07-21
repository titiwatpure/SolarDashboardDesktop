import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { knowledgeBaseAPI } from '../utils/api';

const CATEGORIES = [
  { value: 'general', label: 'ทั่วไป' },
  { value: 'legal', label: 'กฎหมาย/ใบอนุญาต' },
  { value: 'procedure', label: 'ขั้นตอนการทำงาน' },
  { value: 'template', label: 'เทมเพลต' },
  { value: 'faq', label: 'คำถามที่พบบ่อย' },
  { value: 'other', label: 'อื่นๆ' },
];

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [folder, setFolder] = useState('');
  const [folders, setFolders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ topic: '', content: '', keywords: '', category: 'general', folder: 'ทั่วไป' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadItems(); loadFolders(); }, [search, category, folder]);

  const loadFolders = async () => {
    try {
      const data = await knowledgeBaseAPI.getFolders();
      setFolders(data);
    } catch (err) {
      console.error('Failed to load folders:', err);
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      if (folder) params.folder = folder;
      const data = await knowledgeBaseAPI.getAll(params);
      setItems(data);
    } catch (err) {
      console.error('Failed to load knowledge base:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedFile) {
        await knowledgeBaseAPI.uploadFile(selectedFile, formData);
      } else if (editingItem) {
        await knowledgeBaseAPI.update(editingItem.id, formData);
      } else {
        await knowledgeBaseAPI.create(formData);
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({ topic: '', content: '', keywords: '', category: 'general', folder: 'ทั่วไป' });
      setSelectedFile(null);
      loadItems();
      loadFolders();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ topic: item.topic, content: item.content, keywords: item.keywords || '', category: item.category || 'general', folder: item.folder || 'ทั่วไป' });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await knowledgeBaseAPI.delete(id);
      loadItems();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const getCategoryLabel = (cat) => {
    const found = CATEGORIES.find(c => c.value === cat);
    return found ? found.label : cat;
  };

  const getCategoryColor = (cat) => {
    const colors = {
      general: 'bg-slate-100 text-slate-700',
      legal: 'bg-blue-100 text-blue-700',
      procedure: 'bg-green-100 text-green-700',
      template: 'bg-purple-100 text-purple-700',
      faq: 'bg-amber-100 text-amber-700',
      other: 'bg-slate-100 text-slate-700',
    };
    return colors[cat] || colors.general;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => navigate('/')} className="text-sm text-blue-600 hover:text-blue-700 mb-2">← กลับ</button>
            <h1 className="text-2xl font-bold text-slate-900">Knowledge Base</h1>
            <p className="text-sm text-slate-500">จัดการฐานความรู้สำหรับ Chatbot</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditingItem(null); setFormData({ topic: '', content: '', keywords: '', category: 'general' }); setSelectedFile(null); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">
            + เพิ่มข้อมูลใหม่
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3 mb-6">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาหัวข้อหรือเนื้อหา..."
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          <select value={folder} onChange={(e) => setFolder(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="">ทุกโฟลเดอร์</option>
            {folders.map((f, i) => <option key={i} value={f.folder}>{f.folder} ({f.count})</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="">ทุกหมวดหมู่</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">
                  {editingItem ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">หัวข้อ *</label>
                    <input type="text" value={formData.topic} onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="หัวข้อความรู้" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">เนื้อหา *</label>
                    <textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm h-32" placeholder="เนื้อหาความรู้..." />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">คำค้นหา</label>
                      <input type="text" value={formData.keywords} onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="คั่นด้วยจุลภาค" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">หมวดหมู่</label>
                      <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">โฟลเดอร์</label>
                      <input type="text" value={formData.folder} onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="เช่น กฎหมาย, เอกสาร" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">แนบไฟล์ (ไม่บังคับ)</label>
                    <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv" />
                    {selectedFile && <p className="text-xs text-slate-500 mt-1">ไฟล์ที่เลือก: {selectedFile.name}</p>}
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => { setShowForm(false); setEditingItem(null); setSelectedFile(null); }}
                    className="px-4 py-2 text-sm text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">ยกเลิก</button>
                  <button onClick={handleSave} disabled={saving || !formData.topic || !formData.content}
                    className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Items List */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">กำลังโหลด...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            {search || category ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีข้อมูลใน Knowledge Base'}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{item.topic}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(item.category)}`}>
                        {getCategoryLabel(item.category)}
                      </span>
                      {item.folder && item.folder !== 'ทั่วไป' && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">📁 {item.folder}</span>}
                      {item.file_path && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">📎 มีไฟล์แนบ</span>}
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{item.content}</p>
                    {item.keywords && <p className="text-xs text-slate-400 mt-2">คำค้นหา: {item.keywords}</p>}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => handleEdit(item)} className="text-sm text-blue-600 hover:text-blue-700">แก้ไข</button>
                    <button onClick={() => handleDelete(item.id)} className="text-sm text-red-500 hover:text-red-600">ลบ</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

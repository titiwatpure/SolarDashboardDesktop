/**
 * Chatbot API (Enhanced v2)
 * ระบบตอบคำถามอัตโนมัติสำหรับ Solar Dashboard
 * พร้อม Synonym Dictionary + Context Memory + Intent Detection + Knowledge Base
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ============================
// Synonym Dictionary (Expanded)
// ============================
const synonyms = {
  // === สถานะโครงการ ===
  'ติดปัญหา': ['blocked', 'ค้าง', 'ไม่เดิน', 'ติด', 'มีปัญหา', 'ขัดข้อง', 'ไม่ได้', 'ไม่สำเร็จ'],
  'เสร็จ': ['completed', 'done', 'cod', 'สำเร็จ', 'เสร็จสิ้น', 'finish', 'เรียบร้อย', 'ผ่าน'],
  'กำลังทำ': ['in_progress', 'progress', 'ดำเนินการ', 'ทำอยู่', 'รับผิดชอบ', 'ทำ', 'ทำงาน', 'ดำเนินงาน'],
  'เกินกำหนด': ['overdue', 'late', 'ช้า', 'ค้าง', 'เกินเวลา', 'เกิน', 'ล่าช้า', 'ไม่ทัน'],
  'ยังไม่เริ่ม': ['not_started', 'pending', 'รอ', 'ยังไม่ได้ทำ', 'ยังไม่เริ่ม', 'รอเริ่ม'],
  'เสี่ยง': ['risk', 'danger', 'วิกฤต', 'critical', 'high risk', 'เสี่ยงมาก', 'อันตราย'],
  'วิกฤต': ['critical', 'urgent', 'เร่งด่วน', 'ฉุกเฉิน', 'วิกฤตมาก'],
  
  // === เอกสาร ===
  'เอกสาร': ['document', 'doc', 'paper', 'แบบฟอร์ม', 'checklist', 'รายการตรวจ', 'เอกสารตรวจ'],
  'ต้องแก้': ['revision', 'แก้ไข', 'ส่งกลับ', 'customer_revision', 'ต้องแก้ไข', 'ส่งคืน'],
  'พร้อมส่ง': ['ready', 'passed', 'ผ่านแล้ว', 'ส่งได้เลย', 'พร้อมยื่น', 'ตรวจผ่าน'],
  'ปัญหาเอกสาร': ['issue', 'ปัญหา', 'open issue', 'มีปัญหาเอกสาร'],
  
  // === งาน ===
  'งาน': ['task', 'งาน', 'มอบหมาย', 'สั่งงาน'],
  'เกินกำหนดงาน': ['overdue task', 'task overdue', 'งานค้าง', 'งานช้า', 'งานเกิน'],
  'งานเสร็จ': ['task completed', 'งานเสร็จ', 'งานสำเร็จ'],
  
  // === โครงการ ===
  'โครงการ': ['project', 'proj', 'ไซต์', 'site'],
  'ทั้งหมด': ['all', 'total', 'ทุกโครงการ', 'ทุกsite', 'ทุกที่'],
  'ความคืบหน้า': ['progress', 'status', 'สถานะ', 'สรุป', 'ภาพรวม'],
  
  // === บัญชี ===
  'รายได้': ['income', 'revenue', 'เงินเข้า', 'รายรับ'],
  'รายจ่าย': ['expense', 'cost', 'เงินออก', 'ค่าใช้จ่าย'],
  'กำไร': ['profit', 'กำไรสุทธิ', 'ยอดรวม'],
  
  // === ลูกค้า ===
  'ลูกค้า': ['customer', 'client', 'ผู้ว่าจ้าง'],
  
  // === หน่วยงาน ===
  'หน่วยงาน': ['organization', 'org', 'agency', 'กอง'],
  
  // === คำถาม ===
  'กี่': ['how many', 'เท่าไหร่', 'จำนวน', 'มีกี่', 'มากแค่ไหน'],
  'อะไร': ['what', 'อะไร', 'คืออะไร', 'หมายความว่า'],
  'ที่ไหน': ['where', 'ที่ไหน', 'สถานที่', 'อยู่ที่ไหน'],
  'เมื่อไหร่': ['when', 'เมื่อไหร่', 'วันไหน', 'เมื่อไร'],
  'ทำไม': ['why', 'ทำไม', 'เหตุผล', 'เพราะอะไร'],
  'อย่างไร': ['how', 'อย่างไร', 'วิธี', 'ทำยังไง'],
  'เท่าไหร่': ['how much', 'เท่าไหร่', 'ราคา', 'มูลค่า'],
};

// ============================
// Intent Detection
// ============================
const intents = {
  // สอบถามจำนวน
  count: ['กี่', 'จำนวน', 'เท่าไหร่', 'มีกี่', 'มากแค่ไหน', 'how many', 'count'],
  
  // สอบถามสถานะ
  status: ['สถานะ', 'status', 'อยู่ที่ไหน', 'ขั้นตอนไหน', 'เป็นยังไง'],
  
  // สอบถามรายละเอียด
  detail: ['รายละเอียด', 'detail', 'เล่า', 'อธิบาย', 'ข้อมูล', 'info'],
  
  // สอบถามวิธีทำ
  howto: ['วิธี', 'how to', 'ทำยังไง', 'ทำอย่างไร', 'ขั้นตอน'],
  
  // ขอความช่วยเหลือ
  help: ['ช่วย', 'help', 'สอน', 'ช่วยเหลือ', 'ไม่เข้าใจ'],
  
  // เปรียบเทียบ
  compare: ['เปรียบเทียบ', 'compare', 'ต่างกัน', 'ต่างจาก'],
  
  // แนวโน้ม
  trend: ['แนวโน้ม', 'trend', 'เปรียบเทียบ', 'เดือนก่อน', 'ปีก่อน'],
  
  // แนะนำ
  suggest: ['แนะนำ', 'suggest', 'ควรทำ', 'เสนอ', 'proposal'],
};

// ============================
// Context Memory (per session)
// ============================
const contextMemory = new Map();

function getContext(sessionId) {
  if (!contextMemory.has(sessionId)) {
    contextMemory.set(sessionId, {
      history: [],
      lastTopic: null,
      lastEntity: null,
      lastEntities: [],
      followUpCount: 0,
      conversationFlow: [],
    });
  }
  return contextMemory.get(sessionId);
}

function updateContext(sessionId, question, answer, topic, entity) {
  const ctx = getContext(sessionId);
  ctx.history.push({ question, answer, topic, timestamp: Date.now() });
  ctx.lastTopic = topic;
  if (entity) {
    ctx.lastEntity = entity;
    ctx.lastEntities.push(entity);
    if (ctx.lastEntities.length > 5) ctx.lastEntities.shift();
  }
  ctx.followUpCount++;
  ctx.conversationFlow.push({ type: 'user', text: question });
  ctx.conversationFlow.push({ type: 'bot', text: answer });
  
  if (ctx.history.length > 10) ctx.history = ctx.history.slice(-10);
  if (ctx.conversationFlow.length > 20) ctx.conversationFlow = ctx.conversationFlow.slice(-20);
}

// ============================
// Configure multer
// ============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'chat'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // เพิ่มเป็น 20MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|csv|pptx|json|md/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) return cb(null, true);
    cb(new Error('อนุญาตเฉพาะไฟล์: jpg, png, gif, pdf, doc, docx, xls, xlsx, txt, csv, pptx, json, md'));
  }
});

// ============================
// Routes
// ============================

router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { message } = req.body;
    const file = req.file;
    const sessionId = req.user.id;

    if (!message && !file) {
      return res.status(400).json({ error: 'กรุณาระบุคำถามหรือแนบไฟล์' });
    }

    let reply, topic, entity;
    if (file) {
      reply = processFileUpload(message || 'ส่งไฟล์แนบ', file);
      topic = 'file';
    } else {
      const result = await processMessage(message, sessionId);
      reply = result.reply;
      topic = result.topic;
      entity = result.entity;
    }

    updateContext(sessionId, message || 'ไฟล์แนบ', reply, topic, entity);

    res.json({
      reply,
      file: file ? { filename: file.originalname, size: file.size, url: `/uploads/chat/${file.filename}` } : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[CHATBOT]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

router.post('/message', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const sessionId = req.user.id;
    if (!message) return res.status(400).json({ error: 'กรุณาระบุคำถาม' });

    const result = await processMessage(message, sessionId);
    updateContext(sessionId, message, result.reply, result.topic, result.entity);

    res.json({ reply: result.reply, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('[CHATBOT]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const sessionId = req.user.id;
    const ctx = getContext(sessionId);
    
    let suggestions = [
      'โครงการทั้งหมดมีกี่โครงการ?',
      'โครงการไหนติดปัญหาบ้าง?',
      'เอกสารไหนต้องแก้ไข?',
      'ความคืบหน้าโดยรวมเท่าไหร่?',
      'มีงานเกินกำหนดไหม?',
    ];

    if (ctx.lastTopic === 'project') {
      suggestions.unshift('ดูรายละเอียดโครงการนี้');
      suggestions.unshift('ความคืบหน้าโครงการนี้เท่าไหร่?');
    }
    if (ctx.lastTopic === 'document') {
      suggestions.unshift('เอกสารไหนพร้อมส่งแล้ว?');
    }
    if (ctx.lastEntity) {
      suggestions.unshift(`ข้อมูลเพิ่มเติมเกี่ยวกับ ${ctx.lastEntity}`);
    }

    res.json(suggestions.slice(0, 6));
  } catch (error) {
    console.error('[CHATBOT]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

router.get('/history', authenticateToken, async (req, res) => {
  try {
    const sessionId = req.user.id;
    const ctx = getContext(sessionId);
    res.json(ctx.history.slice(-10));
  } catch (error) {
    console.error('[CHATBOT]', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// ============================
// Intent Detection
// ============================
function detectIntent(message) {
  const lowerMsg = message.toLowerCase();
  
  for (const [intent, keywords] of Object.entries(intents)) {
    if (keywords.some(k => lowerMsg.includes(k))) {
      return intent;
    }
  }
  return 'general';
}

// ============================
// Synonym Matching
// ============================
function findSynonymMatch(message) {
  const lowerMsg = message.toLowerCase();
  
  for (const [key, words] of Object.entries(synonyms)) {
    if (lowerMsg.includes(key) || words.some(w => lowerMsg.includes(w.toLowerCase()))) {
      return key;
    }
  }
  return null;
}

// ============================
// Entity Extraction
// ============================
function extractEntity(message) {
  const projectCodeMatch = message.match(/\b([A-Z]{2,4}[\.-][A-Z0-9]{2,})\b/i);
  if (projectCodeMatch) return { type: 'project', value: projectCodeMatch[1].toUpperCase() };
  
  const numberMatch = message.match(/\b(\d+)\b/);
  if (numberMatch) return { type: 'number', value: parseInt(numberMatch[1]) };
  
  return null;
}

// ============================
// Follow-up Detection
// ============================
function isFollowUp(message) {
  const followUpPatterns = [
    /รายละเอียด/, /more info/, /เล่าต่อ/, /ต่อ/,
    /แล้วไง/, /ไงต่อ/, /นอกจากนี้/, /อีก/,
    /ใช่ไหม/, /จริงไหม/, /จริงหรอ/,
  ];
  return followUpPatterns.some(p => p.test(message.toLowerCase()));
}

// ============================
// Knowledge Base Search (Improved)
// ============================
async function searchKnowledgeBase(message) {
  try {
    const lowerMsg = message.toLowerCase();
    
    // 1. ค้นหาจาก topic (ตรงตัว)
    let result = await pool.query(
      'SELECT topic, content, category FROM knowledge_base WHERE LOWER(topic) = ? LIMIT 3',
      [lowerMsg]
    );
    
    // 2. ค้นหาจาก keywords (แยกคำ)
    if (result.rows.length === 0) {
      const words = lowerMsg.split(/\s+/).filter(w => w.length > 1);
      if (words.length > 0) {
        const conditions = words.map(() => '(LOWER(topic) LIKE ? OR LOWER(content) LIKE ? OR LOWER(keywords) LIKE ?)').join(' OR ');
        const params = words.flatMap(w => [`%${w}%`, `%${w}%`, `%${w}%`]);
        result = await pool.query(
          `SELECT topic, content, category FROM knowledge_base WHERE ${conditions} LIMIT 3`,
          params
        );
      }
    }
    
    // 3. ค้นหาจาก topic (partial match)
    if (result.rows.length === 0) {
      result = await pool.query(
        'SELECT topic, content, category FROM knowledge_base WHERE LOWER(topic) LIKE ? OR LOWER(content) LIKE ? LIMIT 3',
        [`%${lowerMsg}%`, `%${lowerMsg}%`]
      );
    }

    if (result.rows.length > 0) {
      let reply = '📚 พบข้อมูลจาก Knowledge Base:\n\n';
      result.rows.forEach((item, i) => {
        reply += `${i + 1}. **${item.topic}** (${item.category})\n`;
        reply += `${item.content.substring(0, 300)}${item.content.length > 300 ? '...' : ''}\n\n`;
      });
      return reply;
    }
  } catch (error) {
    console.error('[KB Search]', error);
  }
  return null;
}

// ============================
// Pattern Handlers (Expanded)
// ============================

async function processMessage(message, sessionId) {
  const lowerMsg = message.toLowerCase();
  const ctx = getContext(sessionId);
  const intent = detectIntent(message);
  const synonymKey = findSynonymMatch(message);
  const entity = extractEntity(message);
  
  // 1. Knowledge Base Search (highest priority)
  const kbResult = await searchKnowledgeBase(message);
  if (kbResult) {
    return { reply: kbResult, topic: 'knowledge_base', entity: null };
  }
  
  // 2. Follow-up questions
  if (isFollowUp(message) && ctx.lastTopic) {
    const followUpReply = await handleFollowUp(ctx, message);
    if (followUpReply) return { reply: followUpReply, topic: ctx.lastTopic, entity: ctx.lastEntity };
  }
  
  // 3. Pattern matching with intent
  const patterns = [
    // === โครงการ ===
    { 
      keywords: ['โครงการทั้งหมด', 'กี่โครงการ', 'จำนวนโครงการ', 'total project', 'ทั้งหมด', 'มีโครงการ'],
      intent: 'count',
      topic: 'project_summary',
      handler: async () => {
        const result = await pool.query('SELECT COUNT(*) as count FROM projects');
        return `ปัจจุบันมีโครงการทั้งหมด ${result.rows[0].count} โครงการในระบบ 📊`;
      }
    },
    {
      keywords: ['ติดปัญหา', 'blocked', 'ค้าง', 'มีปัญหา', 'ไม่เดิน'],
      topic: 'project_blocked',
      handler: async () => {
        const result = await pool.query("SELECT project_code, project_name, current_step FROM projects WHERE status = 'blocked'");
        if (result.rows.length === 0) return 'ไม่มีโครงการที่ติดปัญหาในขณะนี้ ✅';
        const list = result.rows.map(p => `• ${p.project_code}: ${p.project_name} (ขั้นตอน ${p.current_step})`).join('\n');
        return `มี ${result.rows.length} โครงการที่ติดปัญหา:\n${list}`;
      }
    },
    {
      keywords: ['เสร็จ', 'completed', 'COD', 'สำเร็จ', 'เสร็จสิ้น'],
      topic: 'project_completed',
      handler: async () => {
        const result = await pool.query("SELECT COUNT(*) as count FROM projects WHERE status = 'completed'");
        return `มีโครงการที่เสร็จสิ้นแล้ว ${result.rows[0].count} โครงการ ✅`;
      }
    },
    {
      keywords: ['กำลังทำ', 'in_progress', 'ดำเนินการ', 'ทำอยู่', 'กำลังดำเนินงาน'],
      topic: 'project_in_progress',
      handler: async () => {
        const result = await pool.query("SELECT COUNT(*) as count FROM projects WHERE status = 'in_progress'");
        return `มีโครงการที่กำลังดำเนินการ ${result.rows[0].count} โครงการ 🔄`;
      }
    },
    {
      keywords: ['ยังไม่เริ่ม', 'not_started', 'pending', 'รอเริ่ม'],
      topic: 'project_pending',
      handler: async () => {
        const result = await pool.query("SELECT COUNT(*) as count FROM projects WHERE status = 'not_started'");
        return `มีโครงการที่ยังไม่เริ่ม ${result.rows[0].count} โครงการ ⏳`;
      }
    },
    
    // === เอกสาร ===
    {
      keywords: ['เอกสารต้องแก้', 'ต้องแก้ไข', 'revision', 'ส่งกลับ', 'ส่งคืน'],
      topic: 'document_revision',
      handler: async () => {
        const result = await pool.query("SELECT COUNT(*) as count FROM doc_review_checklists WHERE status = 'customer_revision'");
        return `มีเอกสารที่ต้องแก้ไข ${result.rows[0].count} รายการ 📝`;
      }
    },
    {
      keywords: ['เอกสารพร้อมส่ง', 'พร้อมส่งหน่วยงาน', 'passed', 'ผ่านแล้ว', 'ตรวจผ่าน'],
      topic: 'document_ready',
      handler: async () => {
        const result = await pool.query("SELECT COUNT(*) as count FROM doc_review_checklists WHERE status = 'passed'");
        return `มีเอกสารที่พร้อมส่ง ${result.rows[0].count} รายการ 📤`;
      }
    },
    {
      keywords: ['เอกสาร', 'document', 'doc', 'แบบฟอร์ม'],
      topic: 'document',
      handler: async () => {
        const revision = await pool.query("SELECT COUNT(*) as count FROM doc_review_checklists WHERE status = 'customer_revision'");
        const ready = await pool.query("SELECT COUNT(*) as count FROM doc_review_checklists WHERE status = 'passed'");
        const total = await pool.query("SELECT COUNT(*) as count FROM doc_review_checklists");
        return `สรุปเอกสาร:\n• ทั้งหมด: ${total.rows[0].count} รายการ\n• ต้องแก้ไข: ${revision.rows[0].count} รายการ 📝\n• พร้อมส่ง: ${ready.rows[0].count} รายการ 📤`;
      }
    },
    
    // === งานทั้งหมด ===
    {
      keywords: ['งานทั้งหมด', 'กี่งาน', 'จำนวนงาน', 'total task', 'มีงาน'],
      topic: 'task_summary',
      handler: async () => {
        const result = await pool.query(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
          FROM tasks
        `);
        const s = result.rows[0];
        return `สรุปงาน:\n• ทั้งหมด: ${s.total} งาน\n• รอดำเนินการ: ${s.pending} งาน ⏳\n• กำลังทำ: ${s.in_progress} งาน 🔄\n• เสร็จแล้ว: ${s.completed} งาน ✅`;
      }
    },
    {
      keywords: ['งานวันนี้', 'task today', 'งานวันนี้มีอะไร'],
      topic: 'task_today',
      handler: async () => {
        const result = await pool.query("SELECT title, priority, assigned_to FROM tasks WHERE due_date = date('now') AND status != 'completed' LIMIT 5");
        if (result.rows.length === 0) return 'ไม่มีงานครบกำหนดวันนี้ ✅';
        const list = result.rows.map(t => `• ${t.title} (${t.priority})`).join('\n');
        return `งานครบกำหนดวันนี้:\n${list}`;
      }
    },
    {
      keywords: ['งานสัปดาห์นี้', 'task this week', 'งานสัปดาห์นี้มีอะไร'],
      topic: 'task_this_week',
      handler: async () => {
        const result = await pool.query("SELECT COUNT(*) as count FROM tasks WHERE due_date BETWEEN date('now') AND date('now', '+7 days') AND status != 'completed'");
        return `มีงานครบกำหนดสัปดาห์นี้ ${result.rows[0].count} งาน 📅`;
      }
    },
    {
      keywords: ['เกินกำหนด', 'overdue', 'late', 'ค้าง', 'งานค้าง', 'งานช้า', 'เกินเวลา'],
      topic: 'task_overdue',
      handler: async () => {
        const result = await pool.query("SELECT COUNT(*) as count FROM tasks WHERE status IN ('pending', 'in_progress') AND due_date < datetime('now')");
        return `มีงานเกินกำหนด ${result.rows[0].count} รายการ ⚠️`;
      }
    },
    {
      keywords: ['งานเสร็จ', 'task completed', 'งานสำเร็จ'],
      topic: 'task_completed',
      handler: async () => {
        const result = await pool.query("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'");
        return `มีงานที่เสร็จสิ้นแล้ว ${result.rows[0].count} รายการ ✅`;
      }
    },
    {
      keywords: ['งานกำลังทำ', 'task in progress', 'งานที่กำลังทำ'],
      topic: 'task_in_progress',
      handler: async () => {
        const result = await pool.query("SELECT COUNT(*) as count FROM tasks WHERE status = 'in_progress'");
        return `มีงานที่กำลังทำอยู่ ${result.rows[0].count} รายการ 🔄`;
      }
    },
    {
      keywords: ['งานด่วน', 'urgent task', 'งานเร่งด่วน', 'priority urgent'],
      topic: 'task_urgent',
      handler: async () => {
        const result = await pool.query("SELECT COUNT(*) as count FROM tasks WHERE priority = 'urgent' AND status != 'completed'");
        return `มีงานด่วน ${result.rows[0].count} รายการ 🚨`;
      }
    },
    {
      keywords: ['งานของฉัน', 'my task', 'งานที่ฉันรับผิดชอบ'],
      topic: 'my_tasks',
      handler: async (sessionId) => {
        const result = await pool.query("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status != 'completed'", [sessionId]);
        return `คุณมีงานที่ต้องทำ ${result.rows[0].count} งาน 📋`;
      }
    },
    {
      keywords: ['สรุปงาน', 'task summary', 'สรุปสถานะงาน'],
      topic: 'task_summary_detail',
      handler: async () => {
        const result = await pool.query(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
            COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
            COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
            COUNT(CASE WHEN due_date < datetime('now') AND status != 'completed' THEN 1 END) as overdue,
            COUNT(CASE WHEN priority = 'urgent' AND status != 'completed' THEN 1 END) as urgent
          FROM tasks
        `);
        const s = result.rows[0];
        return `สรุปงานทั้งหมด:\n• ทั้งหมด: ${s.total} งาน\n• รอดำเนินการ: ${s.pending} ⏳\n• กำลังทำ: ${s.in_progress} 🔄\n• เสร็จแล้ว: ${s.completed} ✅\n• ยกเลิก: ${s.cancelled} ❌\n• เกินกำหนด: ${s.overdue} ⚠️\n• ด่วน: ${s.urgent} 🚨`;
      }
    },
    {
      keywords: ['งานใกล้ครบกำหนด', 'task due soon', 'งานจะครบกำหนด'],
      topic: 'task_due_soon',
      handler: async () => {
        const result = await pool.query("SELECT COUNT(*) as count FROM tasks WHERE due_date BETWEEN date('now') AND date('now', '+3 days') AND status != 'completed'");
        return `มีงานที่จะครบกำหนดภายใน 3 วัน ${result.rows[0].count} งาน ⏰`;
      }
    },
    
    // === ความคืบหน้า ===
    {
      keywords: ['ความคืบหน้า', 'progress', 'สรุป', 'สถานะ', 'ภาพรวม'],
      topic: 'progress_summary',
      handler: async () => {
        const result = await pool.query(`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
            COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
            COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked,
            COUNT(CASE WHEN status = 'not_started' THEN 1 END) as pending
          FROM projects
        `);
        const s = result.rows[0];
        return `สรุปสถานะโครงการ:\n• ทั้งหมด: ${s.total} โครงการ\n• เสร็จสิ้น: ${s.completed} ✅\n• กำลังทำ: ${s.in_progress} 🔄\n• ติดปัญหา: ${s.blocked} ⚠️\n• ยังไม่เริ่ม: ${s.pending} ⏳`;
      }
    },
    
    // === ความเสี่ยง ===
    {
      keywords: ['ความเสี่ยง', 'risk', 'วิกฤต', 'critical', 'เสี่ยง'],
      topic: 'risk',
      handler: async () => {
        const critical = await pool.query("SELECT COUNT(*) as count FROM projects WHERE risk_level = 'critical'");
        const high = await pool.query("SELECT COUNT(*) as count FROM projects WHERE risk_level = 'high'");
        return `สรุปความเสี่ยง:\n• วิกฤต: ${critical.rows[0].count} โครงการ 🔴\n• สูง: ${high.rows[0].count} โครงการ 🟡`;
      }
    },
    
    // === บัญชี ===
    {
      keywords: ['รายได้', 'income', 'revenue', 'เงินเข้า'],
      topic: 'income',
      handler: async () => {
        const result = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income'");
        return `รายได้รวม: ${Number(result.rows[0].total).toLocaleString()} บาท 💰`;
      }
    },
    {
      keywords: ['รายจ่าย', 'expense', 'cost', 'ค่าใช้จ่าย'],
      topic: 'expense',
      handler: async () => {
        const result = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense'");
        return `รายจ่ายรวม: ${Number(result.rows[0].total).toLocaleString()} บาท 💸`;
      }
    },
    
    // === ลูกค้า ===
    {
      keywords: ['ลูกค้า', 'customer', 'client'],
      topic: 'customer',
      handler: async () => {
        const result = await pool.query("SELECT COUNT(*) as count FROM customers");
        return `มีลูกค้าทั้งหมด ${result.rows[0].count} ราย 👥`;
      }
    },
    
    // === หน่วยงาน ===
    {
      keywords: ['หน่วยงาน', 'organization', 'agency'],
      topic: 'organization',
      handler: async () => {
        const result = await pool.query("SELECT COUNT(*) as count FROM organizations");
        return `มีหน่วยงานทั้งหมด ${result.rows[0].count} แห่ง 🏢`;
      }
    },
    
    // === ช่วย ===
    {
      keywords: ['ช่วย', 'help', 'สอน', 'วิธีใช้', 'how to', 'ช่วยเหลือ', 'ไม่เข้าใจ'],
      topic: 'help',
      handler: async () => {
        return `🤖 ฉันเป็นผู้ช่วยสำหรับระบบ Solar Dashboard\n\nตัวอย่างคำถาม:\n\n📊 โครงการ:\n• "กี่โครงการ?" — นับจำนวนโครงการ\n• "ติดปัญหา?" — ดูโครงการที่ติดปัญหา\n• "เสร็จกี่โครงการ?" — ดูโครงการที่เสร็จแล้ว\n\n📝 เอกสาร:\n• "เอกสาร?" — ดูสถานะเอกสาร\n• "เอกสารต้องแก้?" — ดูเอกสารที่ต้องแก้ไข\n\n📋 งาน:\n• "กี่งาน?" — นับจำนวนงานทั้งหมด\n• "งานวันนี้?" — ดูงานที่ครบกำหนดวันนี้\n• "งานเกินกำหนด?" — ดูงานที่ค้าง\n• "สรุปงาน" — ดูสรุปสถานะงานทั้งหมด\n• "งานด่วน?" — ดูงาน priority urgent\n\n💰 บัญชี:\n• "รายได้เท่าไหร่?" — ดูรายได้รวม\n• "รายจ่ายเท่าไหร่?" — ดูรายจ่ายรวม\n\n👥 อื่นๆ:\n• "กี่ลูกค้า?" — นับจำนวนลูกค้า\n• "กี่หน่วยงาน?" — นับจำนวนหน่วยงาน\n\n💡 ยังสามารถแนบไฟล์มาได้ด้วย!\n📚 หรือเพิ่มข้อมูลใน Knowledge Base ได้ที่เมนู Knowledge Base`;
      }
    },
  ];

  // ค้นหา pattern ที่ตรงกัน
  for (const pattern of patterns) {
    if (pattern.keywords.some(k => lowerMsg.includes(k))) {
      const reply = await pattern.handler();
      return { reply, topic: pattern.topic, entity: entity?.value };
    }
  }
  
  // ตรวจสอบ entity (project code)
  if (entity && entity.type === 'project') {
    const result = await pool.query(
      "SELECT project_code, project_name, status, current_step, progress FROM projects WHERE project_code = ?",
      [entity.value]
    );
    if (result.rows.length > 0) {
      const p = result.rows[0];
      return {
        reply: `โครงการ ${p.project_code}: ${p.project_name}\n• สถานะ: ${p.status}\n• ขั้นตอน: ${p.current_step}\n• ความคืบหน้า: ${p.progress || 0}%`,
        topic: 'project_detail',
        entity: p.project_code
      };
    }
  }

  // Default
  return {
    reply: 'ขออภัย ไม่เข้าใจคำถาม 😅\n\nลองถามใหม่หรือพิมพ์ "ช่วย" เพื่อดูตัวอย่างคำถาม\nหรือเพิ่มข้อมูลใน Knowledge Base ได้ที่เมนู Knowledge Base',
    topic: 'unknown',
    entity: null
  };
}

// ============================
// Follow-up Handlers
// ============================
async function handleFollowUp(ctx, message) {
  const lowerMsg = message.toLowerCase();
  
  if (ctx.lastTopic === 'project_blocked') {
    const result = await pool.query("SELECT project_code, project_name, current_step, risk_level FROM projects WHERE status = 'blocked'");
    if (result.rows.length === 0) return 'ไม่มีโครงการที่ติดปัญหา';
    return `รายละเอียดโครงการที่ติดปัญหา:\n${result.rows.map(p => `• ${p.project_code}: ${p.project_name}\n  ขั้นตอน: ${p.current_step}\n  ความเสี่ยง: ${p.risk_level || 'low'}`).join('\n\n')}`;
  }
  
  if (ctx.lastTopic === 'project_completed') {
    const result = await pool.query("SELECT project_code, project_name, current_step FROM projects WHERE status = 'completed' LIMIT 5");
    if (result.rows.length === 0) return 'ยังไม่มีโครงการที่เสร็จสิ้น';
    return `โครงการที่เสร็จสิ้น:\n${result.rows.map(p => `• ${p.project_code}: ${p.project_name} (${p.current_step})`).join('\n')}`;
  }
  
  if (ctx.lastTopic === 'document_revision') {
    const result = await pool.query("SELECT c.document_name, p.project_code FROM doc_review_checklists c JOIN projects p ON c.project_id = p.id WHERE c.status = 'customer_revision' LIMIT 5");
    if (result.rows.length === 0) return 'ไม่มีเอกสารที่ต้องแก้ไข';
    return `เอกสารที่ต้องแก้ไข:\n${result.rows.map(r => `• ${r.project_code}: ${r.document_name}`).join('\n')}`;
  }
  
  if (ctx.lastTopic === 'task_overdue') {
    const result = await pool.query("SELECT title, due_date, assigned_to FROM tasks WHERE status IN ('pending', 'in_progress') AND due_date < datetime('now') LIMIT 5");
    if (result.rows.length === 0) return 'ไม่มีงานเกินกำหนด';
    return `งานที่เกินกำหนด:\n${result.rows.map(t => `• ${t.title} (กำหนด: ${t.due_date})`).join('\n')}`;
  }
  
  if (ctx.lastTopic === 'task_today') {
    const result = await pool.query("SELECT title, priority, assigned_to FROM tasks WHERE due_date = date('now') AND status != 'completed' LIMIT 10");
    if (result.rows.length === 0) return 'ไม่มีงานครบกำหนดวันนี้';
    return `งานครบกำหนดวันนี้:\n${result.rows.map(t => `• ${t.title} (Priority: ${t.priority})`).join('\n')}`;
  }
  
  if (ctx.lastTopic === 'task_summary_detail') {
    const result = await pool.query("SELECT title, status, priority FROM tasks WHERE status IN ('pending', 'in_progress') ORDER BY priority DESC, due_date ASC LIMIT 5");
    if (result.rows.length === 0) return 'ไม่มีงานค้างอยู่';
    return `งานที่ต้องทำ (เรียงตาม priority):\n${result.rows.map(t => `• ${t.title} (${t.status}, ${t.priority})`).join('\n')}`;
  }

  return null;
}

// ============================
// File Upload Handler
// ============================
function processFileUpload(message, file) {
  const fileExt = path.extname(file.originalname).toLowerCase();
  const fileSize = (file.size / 1024).toFixed(1);
  let fileType = 'ไฟล์';
  if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExt)) fileType = 'รูปภาพ';
  else if (fileExt === '.pdf') fileType = 'PDF';
  else if (['.doc', '.docx'].includes(fileExt)) fileType = 'Word Document';
  else if (['.xls', '.xlsx'].includes(fileExt)) fileType = 'Excel';
  else if (fileExt === '.csv') fileType = 'CSV';
  else if (fileExt === '.txt') fileType = 'Text File';
  else if (fileExt === '.pptx') fileType = 'PowerPoint';
  else if (fileExt === '.json') fileType = 'JSON Data';
  else if (fileExt === '.md') fileType = 'Markdown';
  return `ได้รับ${fileType}: ${file.originalname} (${fileSize} KB)\n\nไฟล์ถูกบันทึกเรียบร้อยแล้ว ✅\nสามารถดูได้ที่: /uploads/chat/${file.filename}`;
}

module.exports = router;

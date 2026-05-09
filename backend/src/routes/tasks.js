const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logActivity } = require('./activity_logs');
const { createNotification } = require('./notifications');

const router = express.Router();

const getTaskById = async (id) => {
  const result = await pool.query(
    `SELECT t.*, u.full_name as assigned_to_name, c.full_name as created_by_name, p.project_name
     FROM tasks t
     LEFT JOIN users u ON t.assigned_to = u.id
     LEFT JOIN users c ON t.created_by = c.id
     LEFT JOIN projects p ON t.project_id = p.id
     WHERE t.id = ?`,
    [id]
  );
  return result.rows[0] || null;
};

// GET /api/tasks — ดึง tasks ทั้งหมด (filter + paginated)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;
    const { project_id, status, priority, assigned_to } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (project_id) {
      whereClause += ' AND t.project_id = ?';
      params.push(project_id);
    }
    if (status) {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }
    if (priority) {
      whereClause += ' AND t.priority = ?';
      params.push(priority);
    }
    if (assigned_to) {
      whereClause += ' AND t.assigned_to = ?';
      params.push(assigned_to);
    }

    const result = await pool.query(
      `SELECT t.*, u.full_name as assigned_to_name, c.full_name as created_by_name, p.project_name
       FROM tasks t
       LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN users c ON t.created_by = c.id
       LEFT JOIN projects p ON t.project_id = p.id
       ${whereClause}
       ORDER BY
         CASE t.priority
           WHEN 'urgent' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END,
         t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM tasks t ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    res.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(Math.ceil(total / limit), 1)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/tasks/:id — ดึง task เดียว
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const task = await getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'ไม่พบงาน' });
    }
    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// POST /api/tasks — สร้าง task ใหม่
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { project_id, title, description, priority, assigned_to, due_date } = req.body;

    if (!project_id || !title) {
      return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'ระดับความสำคัญไม่ถูกต้อง' });
    }

    // ตรวจสอบว่า project มีอยู่
    const projectCheck = await pool.query('SELECT id FROM projects WHERE id = ?', [project_id]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบโครงการ' });
    }

    const id = uuidv4();
    await pool.query(
      `INSERT INTO tasks (id, project_id, title, description, priority, assigned_to, due_date, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, project_id, title, description || null, priority || 'medium', assigned_to || null, due_date || null, req.user.id]
    );

    const task = await getTaskById(id);
    logActivity(req.user.id, 'create', 'task', id, { title, project_id });
    res.status(201).json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// PUT /api/tasks/:id — อัปเดต task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assigned_to, due_date } = req.body;

    const existing = await getTaskById(id);
    if (!existing) {
      return res.status(404).json({ error: 'ไม่พบงาน' });
    }

    // เช็คสิทธิ์: admin, assigned_to, หรือ created_by เท่านั้น
    if (req.user.role !== 'admin' && existing.assigned_to !== req.user.id && existing.created_by !== req.user.id) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์แก้ไขงานนี้' });
    }

    // #28: Priority validation on PUT
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'ระดับความสำคัญไม่ถูกต้อง' });
    }

    // #29: Status validation on PUT
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
    }

    const completedAt = (status === 'completed' && existing.status !== 'completed')
      ? new Date().toISOString()
      : existing.completed_at;

    await pool.query(
      `UPDATE tasks SET
        title = ?, description = ?, status = ?, priority = ?,
        assigned_to = ?, due_date = ?, completed_at = ?, updated_at = ?
       WHERE id = ?`,
      [
        title ?? existing.title,
        description ?? existing.description,
        status ?? existing.status,
        priority ?? existing.priority,
        assigned_to !== undefined ? assigned_to : existing.assigned_to,
        due_date ?? existing.due_date,
        completedAt,
        new Date().toISOString(),
        id
      ]
    );

    const task = await getTaskById(id);
    logActivity(req.user.id, 'update', 'task', id, { status, priority });

    // แจ้งเตือนเมื่อมอบหมายงานให้คนอื่น
    if (assigned_to && assigned_to !== existing.assigned_to && assigned_to !== req.user.id) {
      createNotification(
        assigned_to, 'task_assigned', 'งานที่ได้รับมอบหมาย',
        `คุณได้รับมอบหมายงาน "${task.title}" จาก ${req.user.full_name || req.user.username}`,
        'task', id
      );
    }

    // แจ้งเตือนเมื่อสถานะเปลี่ยนเป็น completed
    if (status === 'completed' && existing.status !== 'completed' && existing.created_by && existing.created_by !== req.user.id) {
      createNotification(
        existing.created_by, 'task_completed', 'งานเสร็จสิ้น',
        `งาน "${task.title}" ถูกทำเสร็จแล้วโดย ${req.user.full_name || req.user.username}`,
        'task', id
      );
    }

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// DELETE /api/tasks/:id — ลบ task (Admin only)
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const existing = await getTaskById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'ไม่พบงาน' });
    }

    await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    logActivity(req.user.id, 'delete', 'task', req.params.id, { title: existing.title });
    res.json({ message: 'ลบงานสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/reports/summary/status — สรุปตามสถานะ
router.get('/summary/status', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      WITH total AS (SELECT COUNT(*) as cnt FROM projects)
      SELECT
        status,
        COUNT(*) as count,
        CASE WHEN (SELECT cnt FROM total) > 0
          THEN ROUND(COUNT(*) * 100.0 / (SELECT cnt FROM total), 1)
          ELSE 0
        END as percentage
      FROM projects
      GROUP BY status
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/reports/summary/size — สรุปตามขนาด
router.get('/summary/size', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        CASE
          WHEN size_kw <= 1000 THEN 'ขนาดเล็ก (≤ 1MW)'
          WHEN size_kw > 1000 THEN 'ขนาดใหญ่ (> 1MW)'
        END as size_category,
        COUNT(*) as count,
        ROUND(AVG(COALESCE(size_kw, 0)), 2) as avg_size,
        ROUND(SUM(COALESCE(size_kw, 0)), 2) as total_capacity
      FROM projects
      GROUP BY size_category
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/reports/summary/province — สรุปตามจังหวัด
router.get('/summary/province', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        province,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        ROUND(100.0 * COUNT(CASE WHEN status = 'completed' THEN 1 END) / COUNT(*), 1) as completion_rate
      FROM projects
      GROUP BY province
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/reports/summary/step — สรุปตามขั้นตอน
router.get('/summary/step', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        current_step as step,
        COUNT(*) as count
      FROM projects
      GROUP BY current_step
      ORDER BY
        CASE current_step
          WHEN 'survey' THEN 1
          WHEN 'design' THEN 2
          WHEN 'erc' THEN 3
          WHEN 'grid' THEN 4
          WHEN 'construction' THEN 5
          WHEN 'testing' THEN 6
          WHEN 'cod' THEN 7
        END
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/reports/summary/step-status — สรุปขั้นตอน + สถานะ (สำหรับ Pipeline)
router.get('/summary/step-status', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        current_step as step,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'not_started' THEN 1 END) as not_started,
        COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting,
        COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM projects
      GROUP BY current_step
      ORDER BY
        CASE current_step
          WHEN 'survey' THEN 1
          WHEN 'design' THEN 2
          WHEN 'erc' THEN 3
          WHEN 'grid' THEN 4
          WHEN 'construction' THEN 5
          WHEN 'testing' THEN 6
          WHEN 'cod' THEN 7
        END
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/reports/summary/timeline — รายงาน Timeline ทั้งหมด (paginated)
router.get('/summary/timeline', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT
        p.project_name,
        p.project_code,
        t.step,
        t.status,
        t.note,
        t.created_at,
        u.full_name as changed_by_name
      FROM project_timeline t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.changed_by
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const countResult = await pool.query('SELECT COUNT(*) as count FROM project_timeline');
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    res.json({ data: result.rows, pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/reports/summary/risk — รายงานความเสี่ยง
router.get('/summary/risk', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id, project_name, project_code, province, size_kw,
        risk_level, risk_factors, status, current_step,
        blocked_date, blocked_reason,
        expected_cod_date, actual_cod_date,
        JULIANDAY('now') - JULIANDAY(expected_cod_date) as days_overdue
      FROM projects
      WHERE risk_level IN ('high', 'critical')
         OR status = 'blocked'
      ORDER BY
        CASE risk_level WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END,
        blocked_date ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/reports/summary/lead-time — ระยะเวลาเฉลี่ยแต่ละขั้นตอน
router.get('/summary/lead-time', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      WITH step_times AS (
        SELECT
          t1.step,
          t1.project_id,
          t1.created_at as step_start,
          MIN(t2.created_at) as step_end
        FROM project_timeline t1
        LEFT JOIN project_timeline t2
          ON t1.project_id = t2.project_id
          AND t2.created_at > t1.created_at
          AND t2.step = t1.step
        WHERE t1.status = 'in_progress'
        GROUP BY t1.step, t1.project_id, t1.created_at
      )
      SELECT
        step,
        COUNT(*) as project_count,
        ROUND(AVG(JULIANDAY(step_end) - JULIANDAY(step_start)), 1) as avg_days
      FROM step_times
      WHERE step_end IS NOT NULL
      GROUP BY step
      ORDER BY
        CASE step
          WHEN 'survey' THEN 1
          WHEN 'design' THEN 2
          WHEN 'erc' THEN 3
          WHEN 'grid' THEN 4
          WHEN 'construction' THEN 5
          WHEN 'testing' THEN 6
          WHEN 'cod' THEN 7
        END
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/reports/summary/performance — สรุปผลงานรายบุคคล
router.get('/summary/performance', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id as user_id,
        u.full_name,
        u.role,
        COUNT(p.id) as total_projects,
        COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN p.status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN p.status = 'blocked' THEN 1 END) as blocked,
        COUNT(CASE WHEN p.risk_level IN ('high', 'critical') THEN 1 END) as high_risk,
        ROUND(100.0 * COUNT(CASE WHEN p.status = 'completed' THEN 1 END) / NULLIF(COUNT(p.id), 0), 1) as completion_rate
      FROM users u
      LEFT JOIN projects p ON p.responsible_user = u.id
      WHERE u.status = 'active'
      GROUP BY u.id, u.full_name, u.role
      HAVING total_projects > 0
      ORDER BY total_projects DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/reports/summary/tasks — สรุป Task ตาม priority/status
router.get('/summary/tasks', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        priority,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN due_date < date('now') AND status NOT IN ('completed', 'cancelled') THEN 1 END) as overdue
      FROM tasks
      GROUP BY priority
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/reports/tasks/by-assignee — สรุปงานตามผู้รับผิดชอบ
router.get('/tasks/by-assignee', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(u.full_name, u.username, '(ไม่มอบหมาย)') as assignee_name,
        u.role as assignee_role,
        COUNT(*) as total,
        COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN t.status = 'cancelled' THEN 1 END) as cancelled,
        COUNT(CASE WHEN t.due_date < date('now') AND t.status NOT IN ('completed', 'cancelled') THEN 1 END) as overdue
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      GROUP BY COALESCE(u.id, '__unassigned__')
      ORDER BY total DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// GET /api/reports/tasks/details — รายละเอียดงานทั้งหมด (paginated)
router.get('/tasks/details', authenticateToken, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT
        t.id,
        t.title,
        t.priority,
        t.status,
        t.due_date,
        t.completed_at,
        t.created_at,
        p.project_name,
        p.project_code,
        COALESCE(u.full_name, u.username, '-') as assigned_to_name
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assigned_to
      ORDER BY
        CASE t.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        t.due_date ASC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const countResult = await pool.query('SELECT COUNT(*) as count FROM tasks');
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    res.json({ data: result.rows, pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;

/**
 * Permit Tracking API
 * ดึงข้อมูลสถานะใบอนุญาตแต่ละโครงการในรูปแบบเดียวกับ Excel
 */

const express = require('express');
const router = express.Router();
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/permit-tracking — ดึงข้อมูลสถานะใบอนุญาตทุกโครงการ
router.get('/', authenticateToken, async (req, res) => {
  try {
    // ดึงข้อมูลโครงการทั้งหมด
    const projectsResult = await pool.query(`
      SELECT 
        id, project_code, project_name, size_kw, service_type, permit_type,
        status, current_step, province
      FROM projects
      ORDER BY created_at DESC
    `);

    // ดึงสถานะ checklist แต่ละโครงการ (LEFT JOIN เพื่อรองรับ package_id = NULL)
    const checklistResult = await pool.query(`
      SELECT 
        c.project_id,
        COALESCE(p.permit_type, c.document_name) as permit_type,
        c.status,
        c.updated_at as completed_at
      FROM doc_review_checklists c
      LEFT JOIN doc_submission_packages p ON c.package_id = p.id
      WHERE c.status IS NOT NULL
    `);

    // สร้าง lookup map สำหรับ checklist
    // Group by project_id + permit_type, เก็บสถานะล่าสุด
    const checklistMap = {};
    if (checklistResult && checklistResult.rows) {
      checklistResult.rows.forEach(row => {
        if (!checklistMap[row.project_id]) {
          checklistMap[row.project_id] = {};
        }
        // เก็บสถานะล่าสุด (updated_at ล่าสุด)
        const existing = checklistMap[row.project_id][row.permit_type];
        if (!existing || new Date(row.completed_at) > new Date(existing.completed_at)) {
          checklistMap[row.project_id][row.permit_type] = {
            status: row.status,
            completed_at: row.completed_at
          };
        }
      });
    }

    // สร้างข้อมูลในรูปแบบ Excel
    const trackingData = (projectsResult.rows || []).map((project, index) => {
      const checklists = checklistMap[project.id] || {};
      
      return {
        priority: index + 1,
        project_code: project.project_code || '',
        project_name: project.project_name || '',
        size_kw: project.size_kw || 0,
        cop: formatStatus(checklists.cop),
        esa: formatStatus(checklists.esa),
        act_deat: formatStatus(checklists.deat),
        ring_deat: formatStatus(checklists.ring_deat),
        erc: formatStatus(checklists.erc),
        dede: formatStatus(checklists.dede),
        pea: formatStatus(checklists.pea),
        service_type: project.service_type || '',
        permit_type: project.permit_type || '',
        status: project.status || '',
        current_step: project.current_step || '',
        province: project.province || ''
      };
    });

    res.json({
      data: trackingData,
      total: trackingData.length,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Permit tracking error:', error.message, error.stack);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด', detail: error.message });
  }
});

// Helper: แปลงสถานะเป็นรูปแบบ Excel
function formatStatus(checklistData) {
  if (!checklistData) return 'N/A';
  
  const statusMap = {
    'passed': 'Done',
    'pending': 'รอดำเนินการ',
    'checking': 'On Process',
    'received': 'ส่งแล้ว',
    'customer_revision': 'อยู่ระหว่างแก้ไข',
    'failed': 'ไม่ผ่าน',
    'skipped': 'N/A'
  };
  
  return statusMap[checklistData.status] || checklistData.status;
}

module.exports = router;

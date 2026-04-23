const express = require('express');
const router = express.Router();
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Get documents by project
router.get('/project/:project_id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM documents WHERE project_id = $1 ORDER BY uploaded_at DESC',
      [req.params.project_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Upload document
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      project_id,
      document_name,
      document_type,
      file_path,
      file_size,
      description
    } = req.body;

    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO documents (
        id, project_id, document_name, document_type, file_path, 
        file_size, upload_by, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id, project_id, document_name, document_type, file_path,
        file_size, req.user.id, description
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

// Delete document
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM documents WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบเอกสาร' });
    }

    res.json({ message: 'ลบเอกสารสำเร็จ' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด' });
  }
});

module.exports = router;

const pool = require('../database');

// Calculate risk level for a project based on delay, blockage, and dependency failures
const calculateRisk = async (projectId) => {
  try {
    const result = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    const project = result.rows[0];
    if (!project) return;

    const now = new Date();
    let riskScore = 0;
    const factors = {};

    // 1. Delay factor: days since start vs expected COD
    if (project.expected_cod_date && project.start_date) {
      const startDate = new Date(project.start_date);
      const expectedCod = new Date(project.expected_cod_date);
      const totalDays = (expectedCod - startDate) / (1000 * 60 * 60 * 24);
      const elapsedDays = (now - startDate) / (1000 * 60 * 60 * 24);

      if (totalDays > 0) {
        const progress = elapsedDays / totalDays;
        factors.delay_days = Math.max(0, Math.round(elapsedDays - totalDays));
        factors.progress_pct = Math.round(progress * 100);

        if (project.status !== 'completed') {
          if (progress > 1.5) riskScore += 40;
          else if (progress > 1.2) riskScore += 30;
          else if (progress > 1.0) riskScore += 20;
          else if (progress > 0.8) riskScore += 10;
        }
      }
    }

    // 2. Blockage factor
    if (project.status === 'blocked' && project.blocked_date) {
      const blockedDate = new Date(project.blocked_date);
      const blockedDays = Math.round((now - blockedDate) / (1000 * 60 * 60 * 24));
      factors.blocked_days = blockedDays;

      if (blockedDays > 30) riskScore += 40;
      else if (blockedDays > 14) riskScore += 30;
      else if (blockedDays > 7) riskScore += 20;
      else riskScore += 10;
    }

    // 3. Checkpoint failure factor
    const cpResult = await pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'pending' AND required = 1 THEN 1 END) as pending_required
       FROM checkpoints WHERE project_id = ?`,
      [projectId]
    );
    const cp = cpResult.rows[0];
    factors.failed_checkpoints = cp.failed;
    factors.pending_required_checkpoints = cp.pending_required;

    if (cp.failed > 3) riskScore += 30;
    else if (cp.failed > 1) riskScore += 20;
    else if (cp.failed > 0) riskScore += 10;

    // 4. Overdue tasks factor
    const taskResult = await pool.query(
      `SELECT COUNT(*) as overdue FROM tasks
       WHERE project_id = ? AND status NOT IN ('completed', 'cancelled')
       AND due_date < ?`,
      [projectId, now.toISOString()]
    );
    factors.overdue_tasks = taskResult.rows[0].overdue;

    if (factors.overdue_tasks > 5) riskScore += 20;
    else if (factors.overdue_tasks > 2) riskScore += 15;
    else if (factors.overdue_tasks > 0) riskScore += 10;

    // 5. Status-based risk
    if (project.status === 'rejected') riskScore += 20;

    // Determine risk level
    let riskLevel = 'low';
    if (riskScore >= 80) riskLevel = 'critical';
    else if (riskScore >= 50) riskLevel = 'high';
    else if (riskScore >= 25) riskLevel = 'medium';

    await pool.query(
      'UPDATE projects SET risk_level = ?, risk_factors = ? WHERE id = ?',
      [riskLevel, JSON.stringify(factors), projectId]
    );

    return { riskLevel, riskScore, factors };
  } catch (error) {
    console.error('Risk calculation error:', error);
    return null;
  }
};

// Recalculate risk for all projects
const recalculateAllRisks = async () => {
  try {
    const result = await pool.query('SELECT id FROM projects WHERE status NOT IN (?, ?)', ['completed', 'not_started']);
    for (const row of result.rows) {
      await calculateRisk(row.id);
    }
  } catch (error) {
    console.error('Bulk risk calculation error:', error);
  }
};

module.exports = { calculateRisk, recalculateAllRisks };

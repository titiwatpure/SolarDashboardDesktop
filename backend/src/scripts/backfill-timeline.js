/**
 * Script: Backfill Timeline Data
 * สร้าง timeline entries จากข้อมูลเดิมในระบบ
 * รัน: node src/scripts/backfill-timeline.js
 */

const pool = require('../database');
const { v4: uuidv4 } = require('uuid');

async function backfillTimeline() {
  console.log('=== Backfill Timeline Data ===\n');

  // 1. Backfill จาก document_receipts (event: received)
  console.log('1. Backfill จาก document_receipts...');
  const receipts = await pool.query(`
    SELECT r.*, c.document_name
    FROM document_receipts r
    LEFT JOIN doc_review_checklists c ON r.checklist_item_id = c.id
    WHERE r.checklist_item_id IS NOT NULL
  `);

  let receiptCount = 0;
  for (const receipt of receipts.rows) {
    // ตรวจสอบว่ามี timeline อยู่แล้วหรือไม่
    const existing = await pool.query(
      'SELECT id FROM doc_review_timeline WHERE checklist_id = ? AND event_type = ? AND created_at = ?',
      [receipt.checklist_item_id, 'received', receipt.created_at]
    );
    if (existing.rows.length > 0) continue;

    await pool.query(
      `INSERT INTO doc_review_timeline (id, checklist_id, package_id, event_type, event_data, performed_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        receipt.checklist_item_id,
        receipt.package_id,
        'received',
        JSON.stringify({
          received_from: receipt.received_from,
          received_channel: receipt.received_channel,
          revision_round: receipt.revision_round
        }),
        receipt.created_by,
        receipt.created_at
      ]
    );
    receiptCount++;
  }
  console.log('   สร้าง ' + receiptCount + ' timeline entries จาก receipts');

  // 2. Backfill จาก document_issues (event: issue)
  console.log('2. Backfill จาก document_issues...');
  const issues = await pool.query(`
    SELECT i.*, c.document_name
    FROM document_issues i
    LEFT JOIN doc_review_checklists c ON i.checklist_item_id = c.id
    WHERE i.checklist_item_id IS NOT NULL
  `);

  let issueCount = 0;
  for (const issue of issues.rows) {
    // ตรวจสอบว่ามี timeline อยู่แล้วหรือไม่
    const existing = await pool.query(
      'SELECT id FROM doc_review_timeline WHERE checklist_id = ? AND event_type = ? AND created_at = ?',
      [issue.checklist_item_id, 'issue', issue.created_at]
    );
    if (existing.rows.length > 0) continue;

    await pool.query(
      `INSERT INTO doc_review_timeline (id, checklist_id, package_id, event_type, event_data, performed_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        issue.checklist_item_id,
        issue.package_id,
        'issue',
        JSON.stringify({
          issue_source: issue.issue_source,
          description: issue.description
        }),
        issue.created_by,
        issue.created_at
      ]
    );
    issueCount++;

    // ถ้า issue resolved แล้ว สร้าง timeline issue_resolved ด้วย
    if (issue.status === 'resolved' && issue.resolved_at) {
      const existingResolved = await pool.query(
        'SELECT id FROM doc_review_timeline WHERE checklist_id = ? AND event_type = ? AND created_at = ?',
        [issue.checklist_item_id, 'issue_resolved', issue.resolved_at]
      );
      if (existingResolved.rows.length === 0) {
        await pool.query(
          `INSERT INTO doc_review_timeline (id, checklist_id, package_id, event_type, event_data, performed_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(),
            issue.checklist_item_id,
            issue.package_id,
            'issue_resolved',
            JSON.stringify({ issue_id: issue.id }),
            issue.created_by,
            issue.resolved_at
          ]
        );
        issueCount++;
      }
    }
  }
  console.log('   สร้าง ' + issueCount + ' timeline entries จาก issues');

  // 3. Backfill จาก doc_agency_submissions (event: submitted)
  console.log('3. Backfill จาก doc_agency_submissions...');
  const submissions = await pool.query(`
    SELECT s.*, c.id as checklist_id
    FROM doc_agency_submissions s
    LEFT JOIN doc_review_checklists c ON c.project_id = s.project_id AND c.package_id = s.package_id
    WHERE s.project_id IS NOT NULL
  `);

  let submissionCount = 0;
  for (const sub of submissions.rows) {
    if (!sub.checklist_id) continue;

    const existing = await pool.query(
      'SELECT id FROM doc_review_timeline WHERE checklist_id = ? AND event_type = ? AND created_at = ?',
      [sub.checklist_id, 'submitted', sub.created_at]
    );
    if (existing.rows.length > 0) continue;

    await pool.query(
      `INSERT INTO doc_review_timeline (id, checklist_id, package_id, event_type, event_data, performed_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        sub.checklist_id,
        sub.package_id,
        'submitted',
        JSON.stringify({
          agency_name: sub.agency_name,
          round: sub.submission_round
        }),
        null,
        sub.created_at
      ]
    );
    submissionCount++;
  }
  console.log('   สร้าง ' + submissionCount + ' timeline entries จาก submissions');

  // สรุป
  const total = await pool.query('SELECT COUNT(*) as count FROM doc_review_timeline');
  console.log('\n=== Backfill เสร็จสิ้น ===');
  console.log('Timeline entries ทั้งหมด: ' + total.rows[0].count);
}

pool.ready.then(backfillTimeline).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

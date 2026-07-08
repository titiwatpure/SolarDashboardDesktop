const request = require('supertest');
const app = require('../src/index');

let token;
let testProjectId;
let testPackageId;
let testChecklistId;
let testIssueId;
let testReceiptId;
let testReportId;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin' });
  token = res.body.accessToken;
});

describe('Doc Review Module — Full Workflow', () => {

  // ============================================================
  // 1. Dashboard Summary
  // ============================================================
  describe('GET /api/doc-review/dashboard/summary', () => {
    it('should return KPI counts', async () => {
      const res = await request(app)
        .get('/api/doc-review/dashboard/summary')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('waiting_documents');
      expect(res.body).toHaveProperty('approved');
    });

    it('should NOT be caught by /:id route', async () => {
      const res = await request(app)
        .get('/api/doc-review/dashboard/summary')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.total).toBeDefined();
    });
  });

  // ============================================================
  // 2. Template Checklists
  // ============================================================
  describe('Template Checklists', () => {
    it('GET /api/doc-review/template-checklists — list templates', async () => {
      const res = await request(app)
        .get('/api/doc-review/template-checklists')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET template detail with items', async () => {
      const listRes = await request(app)
        .get('/api/doc-review/template-checklists')
        .set('Authorization', `Bearer ${token}`);
      if (!listRes.body || listRes.body.length === 0) return;
      const tplId = listRes.body[0].id;

      const res = await request(app)
        .get(`/api/doc-review/template-checklists/${tplId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('items');
      expect(Array.isArray(res.body.items)).toBe(true);
    });
  });

  // ============================================================
  // 3. Projects
  // ============================================================
  describe('Doc Review Projects', () => {
    it('GET /api/doc-review — list projects', async () => {
      const res = await request(app)
        .get('/api/doc-review')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        testProjectId = res.body[0].id;
      }
    });

    it('GET project detail', async () => {
      if (!testProjectId) return;
      const res = await request(app)
        .get(`/api/doc-review/${testProjectId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('project_code');
      expect(res.body).toHaveProperty('status_label');
    });

    it('PUT — reject invalid project_status', async () => {
      if (!testProjectId) return;
      const res = await request(app)
        .put(`/api/doc-review/${testProjectId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ project_status: 'hacked_status' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('สถานะไม่ถูกต้อง');
      expect(res.body.valid).toBeDefined();
    });

    it('PUT — accept valid project_status', async () => {
      if (!testProjectId) return;
      const res = await request(app)
        .put(`/api/doc-review/${testProjectId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ project_status: 'internal_review' });
      expect(res.status).toBe(200);
      expect(res.body.project_status).toBe('internal_review');
    });
  });

  // ============================================================
  // 4. Packages
  // ============================================================
  describe('Submission Packages', () => {
    it('GET packages for project', async () => {
      if (!testProjectId) return;
      const res = await request(app)
        .get(`/api/doc-review/projects/${testProjectId}/packages`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        testPackageId = res.body[0].id;
      }
    });

    it('PUT — reject invalid package_status', async () => {
      if (!testPackageId) return;
      const res = await request(app)
        .put(`/api/doc-review/packages/${testPackageId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ package_status: 'fake_status' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('สถานะไม่ถูกต้อง');
    });
  });

  // ============================================================
  // 5. Issues
  // ============================================================
  describe('Document Issues', () => {
    it('GET issues for package — empty initially', async () => {
      if (!testPackageId) return;
      const res = await request(app)
        .get(`/api/doc-review/packages/${testPackageId}/issues`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('POST create issue', async () => {
      if (!testPackageId) return;
      // Find a checklist item for this package
      const pkgRes = await request(app)
        .get(`/api/doc-review/packages/${testPackageId}`)
        .set('Authorization', `Bearer ${token}`);
      if (!pkgRes.body.checklists || pkgRes.body.checklists.length === 0) return;
      testChecklistId = pkgRes.body.checklists[0].id;

      const res = await request(app)
        .post('/api/doc-review/issues')
        .set('Authorization', `Bearer ${token}`)
        .send({
          checklist_item_id: testChecklistId,
          package_id: testPackageId,
          issue_source: 'internal',
          description: 'Test issue - เอกสารไม่ครบ',
          required_action: 'ส่งเอกสารเพิ่ม'
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('open');
      expect(res.body.revision_round).toBeGreaterThanOrEqual(1);
      testIssueId = res.body.id;
    });

    it('GET issues — should have 1 now', async () => {
      if (!testPackageId) return;
      const res = await request(app)
        .get(`/api/doc-review/packages/${testPackageId}/issues`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('PUT resolve issue', async () => {
      if (!testIssueId) return;
      const res = await request(app)
        .put(`/api/doc-review/issues/${testIssueId}/resolve`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('สำเร็จ');
    });

    it('PUT re-resolve same issue — should be blocked', async () => {
      if (!testIssueId) return;
      const res = await request(app)
        .put(`/api/doc-review/issues/${testIssueId}/resolve`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('แก้ไขแล้ว');
    });
  });

  // ============================================================
  // 6. Receipts
  // ============================================================
  describe('Document Receipts', () => {
    it('POST create receipt', async () => {
      if (!testChecklistId || !testPackageId) return;
      const res = await request(app)
        .post('/api/doc-review/receipts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          checklist_item_id: testChecklistId,
          package_id: testPackageId,
          received_from: 'คุณทดสอบ',
          received_channel: 'line',
          received_date: '2026-07-04',
          notes: 'ทดสอบบันทึกรับเอกสาร'
        });
      expect(res.status).toBe(201);
      expect(res.body.revision_round).toBeGreaterThanOrEqual(1);
      testReceiptId = res.body.id;
    });

    it('GET receipts for checklist', async () => {
      if (!testChecklistId) return;
      const res = await request(app)
        .get(`/api/doc-review/receipts/checklists/${testChecklistId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================
  // 7. Correction Reports
  // ============================================================
  describe('Correction Reports', () => {
    it('POST create report', async () => {
      if (!testPackageId || !testIssueId) return;
      const res = await request(app)
        .post('/api/doc-review/correction-reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          package_id: testPackageId,
          issue_ids: [testIssueId]
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      testReportId = res.body.id;
    });

    it('GET report detail with issue_details', async () => {
      if (!testReportId) return;
      const res = await request(app)
        .get(`/api/doc-review/correction-reports/${testReportId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.issue_details).toBeDefined();
      expect(Array.isArray(res.body.issue_details)).toBe(true);
      expect(res.body.package_name).toBeDefined();
      expect(res.body.project_code).toBeDefined();
    });

    it('POST report — reject mismatched issue_ids', async () => {
      if (!testPackageId) return;
      const res = await request(app)
        .post('/api/doc-review/correction-reports')
        .set('Authorization', `Bearer ${token}`)
        .send({
          package_id: testPackageId,
          issue_ids: ['fake-issue-id-not-belonging-to-package']
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('ไม่ได้เป็นของชุดเอกสารนี้');
    });

    it('GET non-existent report — 404', async () => {
      const res = await request(app)
        .get('/api/doc-review/correction-reports/non-existent-id')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  // ============================================================
  // 8. Agency Submissions
  // ============================================================
  describe('Agency Submissions', () => {
    it('POST submit — blocked if not ready_to_submit', async () => {
      if (!testProjectId) return;
      const res = await request(app)
        .post(`/api/doc-review/projects/${testProjectId}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          agency_name: 'กกพ.',
          submitted_date: '2026-07-05',
          notes: 'test submit'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('อนุมัติภายใน');
    });

    it('POST submit — allowed when ready_to_submit', async () => {
      // Find a ready_to_submit project
      const listRes = await request(app)
        .get('/api/doc-review')
        .set('Authorization', `Bearer ${token}`);
      const ready = listRes.body.find(p => p.project_status === 'ready_to_submit');
      if (!ready) return;

      const res = await request(app)
        .post(`/api/doc-review/projects/${ready.id}/submit`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          agency_name: 'กรมโรงงาน',
          submitted_date: '2026-07-05',
          notes: 'ยื่นครั้งแรก'
        });
      expect(res.status).toBe(201);
      expect(res.body.agency_status).toBe('pending');
      expect(res.body.submission_round).toBe(1);
    });

    it('PUT update submission — set revision_requested', async () => {
      // Find a pending submission
      const listRes = await request(app)
        .get('/api/doc-review')
        .set('Authorization', `Bearer ${token}`);
      const projects = listRes.body || [];
      let subId = null;
      let projId = null;
      for (const p of projects) {
        const subs = await request(app)
          .get(`/api/doc-review/projects/${p.id}/submissions`)
          .set('Authorization', `Bearer ${token}`);
        const pending = (subs.body || []).find(s => s.agency_status === 'pending');
        if (pending) { subId = pending.id; projId = p.id; break; }
      }
      if (!subId) return;

      const res = await request(app)
        .put(`/api/doc-review/submissions/${subId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          agency_status: 'revision_requested',
          agency_comment: 'กรุณาแก้ไขแบบฟอร์มคำขอ',
          response_date: '2026-07-05'
        });
      expect(res.status).toBe(200);
      expect(res.body.agency_status).toBe('revision_requested');
      expect(res.body.agency_comment).toBe('กรุณาแก้ไขแบบฟอร์มคำขอ');

      // Verify project status updated to agency_revision
      const projRes = await request(app)
        .get(`/api/doc-review/${projId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(projRes.body.project_status).toBe('agency_revision');
    });
  });

  // ============================================================
  // 9. Checklist Status Validation
  // ============================================================
  describe('Checklist Status Validation', () => {
    it('PUT — reject invalid checklist status', async () => {
      if (!testChecklistId) return;
      const res = await request(app)
        .put(`/api/doc-review/checklists/${testChecklistId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'totally_fake_status' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('สถานะไม่ถูกต้อง');
      expect(res.body.valid).toContain('passed');
    });
  });

  // ============================================================
  // 10. Auth guard
  // ============================================================
  describe('Auth Guards', () => {
    it('all endpoints reject without token', async () => {
      const endpoints = [
        ['GET', '/api/doc-review'],
        ['GET', '/api/doc-review/dashboard/summary'],
        ['GET', '/api/doc-review/template-checklists'],
        ['POST', '/api/doc-review/issues'],
        ['POST', '/api/doc-review/receipts'],
        ['POST', '/api/doc-review/correction-reports'],
      ];
      for (const [method, url] of endpoints) {
        const res = await request(app)[method.toLowerCase()](url);
        expect(res.status).toBe(401);
      }
    });
  });
});

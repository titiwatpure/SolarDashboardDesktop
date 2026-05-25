/**
 * Smoke Test - ทดสอบทุก API endpoint
 * รัน: node test/smoke.js
 * ต้อง start backend ก่อน: cd backend && node src/index.js
 */

const http = require('http');

const BASE = process.env.API_URL || 'http://localhost:5000/api';
const results = [];
let token = null;
let refreshToken = null;
let createdIds = {};

// ─── HTTP helper ───────────────────────────────────────────

function request(method, path, body = null, opts = {}) {
  return new Promise((resolve) => {
    const url = new URL(`${BASE}${path}`);
    const start = Date.now();
    const headers = { 'Content-Type': 'application/json' };
    if (token && !opts.noAuth) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const ms = Date.now() - start;
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode, ms, json, raw: data });
      });
    });

    req.on('error', (err) => resolve({ status: 0, ms: Date.now() - start, error: err.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ status: 0, ms: Date.now() - start, error: 'timeout' }); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ─── Test runner ───────────────────────────────────────────

async function test(name, fn) {
  try {
    const result = await fn();
    const status = result.pass ? 'PASS' : 'FAIL';
    results.push({ name, status, ms: result.ms, detail: result.detail || '' });
    console.log(`  [${status}] ${name} (${result.ms}ms)${result.detail ? ' - ' + result.detail : ''}`);
  } catch (err) {
    results.push({ name, status: 'ERROR', ms: 0, detail: err.message });
    console.log(`  [ERROR] ${name} - ${err.message}`);
  }
}

function expect(res, opts = {}) {
  const { status, minStatus, maxStatus, hasField } = opts;
  if (status && res.status !== status) return { pass: false, ms: res.ms, detail: `expected ${status}, got ${res.status}` };
  if (minStatus && res.status < minStatus) return { pass: false, ms: res.ms, detail: `status ${res.status} < ${minStatus}` };
  if (maxStatus && res.status > maxStatus) return { pass: false, ms: res.ms, detail: `status ${res.status} > ${maxStatus}` };
  if (hasField && (!res.json || !(hasField in res.json))) return { pass: false, ms: res.ms, detail: `missing field: ${hasField}` };
  if (res.error) return { pass: false, ms: res.ms, detail: res.error };
  return { pass: true, ms: res.ms };
}

// ─── Tests ─────────────────────────────────────────────────

async function run() {
  console.log('\n=== SOLAR DASHBOARD SMOKE TEST ===\n');
  const totalStart = Date.now();

  // ── AUTH ──
  console.log('── AUTH ──');
  await test('POST /auth/login', async () => {
    const res = await request('POST', '/auth/login', { username: 'admin', password: 'admin' }, { noAuth: true });
    if (res.json?.accessToken) { token = res.json.accessToken; refreshToken = res.json.refreshToken; }
    return expect(res, { status: 200, hasField: 'accessToken' });
  });

  await test('GET /auth/sessions', async () => {
    const res = await request('GET', '/auth/sessions');
    return expect(res, { status: 200 });
  });

  await test('POST /auth/refresh', async () => {
    if (!refreshToken) return { pass: false, ms: 0, detail: 'no refreshToken' };
    const res = await request('POST', '/auth/refresh', { refreshToken }, { noAuth: true });
    if (res.json?.accessToken) { token = res.json.accessToken; refreshToken = res.json.refreshToken; }
    return expect(res, { status: 200, hasField: 'accessToken' });
  });

  // ── HEALTH ──
  console.log('\n── HEALTH ──');
  await test('GET /health', async () => {
    const res = await request('GET', '/health', null, { noAuth: true });
    return expect(res, { status: 200, hasField: 'database' });
  });

  // ── PROJECTS ──
  console.log('\n── PROJECTS ──');
  await test('GET /projects', async () => {
    const res = await request('GET', '/projects');
    return expect(res, { status: 200 });
  });

  await test('GET /projects/stats/kpis', async () => {
    const res = await request('GET', '/projects/stats/kpis');
    return expect(res, { status: 200 });
  });

  await test('POST /projects (create)', async () => {
    const res = await request('POST', '/projects', {
      project_name: 'Smoke Test Project',
      project_code: `SMOKE-${Date.now()}`,
      size_kw: 100,
      province: 'กรุงเทพ',
    });
    if (res.json?.id) createdIds.project = res.json.id;
    if (res.json?.projectId) createdIds.project = res.json.projectId;
    return expect(res, { minStatus: 200, maxStatus: 201 });
  });

  await test('GET /projects/:id', async () => {
    if (!createdIds.project) return { pass: false, ms: 0, detail: 'no project created' };
    const res = await request('GET', `/projects/${createdIds.project}`);
    return expect(res, { status: 200 });
  });

  await test('PUT /projects/:id', async () => {
    if (!createdIds.project) return { pass: false, ms: 0, detail: 'no project created' };
    const res = await request('PUT', `/projects/${createdIds.project}`, { description: 'Updated by smoke test' });
    return expect(res, { status: 200 });
  });

  await test('GET /projects/:id/timeline', async () => {
    if (!createdIds.project) return { pass: false, ms: 0, detail: 'no project created' };
    const res = await request('GET', `/projects/${createdIds.project}/timeline`);
    return expect(res, { status: 200 });
  });

  await test('GET /projects/:id/specs', async () => {
    if (!createdIds.project) return { pass: false, ms: 0, detail: 'no project created' };
    const res = await request('GET', `/projects/${createdIds.project}/specs`);
    return expect(res, { status: 200 });
  });

  // ── USERS ──
  console.log('\n── USERS ──');
  await test('GET /users/profile', async () => {
    const res = await request('GET', '/users/profile');
    return expect(res, { status: 200, hasField: 'username' });
  });

  await test('GET /users', async () => {
    const res = await request('GET', '/users');
    return expect(res, { status: 200 });
  });

  await test('POST /users (create)', async () => {
    const res = await request('POST', '/users', {
      username: `smoketest_${Date.now()}`,
      email: `smoke_${Date.now()}@test.com`,
      password: 'smoketest123',
      full_name: 'Smoke Test User',
      role: 'staff',
    });
    if (res.json?.userId) createdIds.user = res.json.userId;
    if (res.json?.id) createdIds.user = res.json.id;
    return expect(res, { minStatus: 200, maxStatus: 201 });
  });

  await test('PUT /users/:id', async () => {
    if (!createdIds.user) return { pass: false, ms: 0, detail: 'no user created' };
    const res = await request('PUT', `/users/${createdIds.user}`, { full_name: 'Updated Smoke User' });
    return expect(res, { status: 200 });
  });

  // ── CUSTOMERS ──
  console.log('\n── CUSTOMERS ──');
  await test('GET /customers', async () => {
    const res = await request('GET', '/customers');
    return expect(res, { status: 200 });
  });

  await test('POST /customers (create)', async () => {
    const res = await request('POST', '/customers', {
      customer_name: 'Smoke Test Customer',
      customer_type: 'company',
      contact_name: 'Test Contact',
    });
    if (res.json?.id) createdIds.customer = res.json.id;
    if (res.json?.customerId) createdIds.customer = res.json.customerId;
    return expect(res, { minStatus: 200, maxStatus: 201 });
  });

  await test('GET /customers/:id', async () => {
    if (!createdIds.customer) return { pass: false, ms: 0, detail: 'no customer created' };
    const res = await request('GET', `/customers/${createdIds.customer}`);
    return expect(res, { status: 200 });
  });

  // ── ORGANIZATIONS ──
  console.log('\n── ORGANIZATIONS ──');
  await test('GET /organizations', async () => {
    const res = await request('GET', '/organizations');
    return expect(res, { status: 200 });
  });

  // ── DOCUMENTS ──
  console.log('\n── DOCUMENTS ──');
  await test('GET /documents', async () => {
    const res = await request('GET', '/documents');
    return expect(res, { status: 200 });
  });

  await test('GET /documents/summary', async () => {
    const res = await request('GET', '/documents/summary');
    return expect(res, { status: 200 });
  });

  // ── TASKS ──
  console.log('\n── TASKS ──');
  await test('GET /tasks', async () => {
    const res = await request('GET', '/tasks');
    return expect(res, { status: 200 });
  });

  await test('POST /tasks (create)', async () => {
    if (!createdIds.project) return { pass: false, ms: 0, detail: 'no project' };
    const res = await request('POST', '/tasks', {
      project_id: createdIds.project,
      title: 'Smoke Test Task',
      priority: 'low',
    });
    if (res.json?.id) createdIds.task = res.json.id;
    if (res.json?.taskId) createdIds.task = res.json.taskId;
    return expect(res, { minStatus: 200, maxStatus: 201 });
  });

  // ── NOTIFICATIONS ──
  console.log('\n── NOTIFICATIONS ──');
  await test('GET /notifications', async () => {
    const res = await request('GET', '/notifications');
    return expect(res, { status: 200 });
  });

  await test('GET /notifications/unread-count', async () => {
    const res = await request('GET', '/notifications/unread-count');
    return expect(res, { status: 200 });
  });

  // ── REPORTS ──
  console.log('\n── REPORTS ──');
  const reportEndpoints = [
    'summary/status', 'summary/size', 'summary/province', 'summary/step',
    'summary/step-status', 'summary/timeline', 'summary/risk',
    'summary/lead-time', 'summary/performance', 'summary/tasks',
    'tasks/by-assignee', 'tasks/details',
  ];
  for (const ep of reportEndpoints) {
    await test(`GET /reports/${ep}`, async () => {
      const res = await request('GET', `/reports/${ep}`);
      return expect(res, { status: 200 });
    });
  }

  // ── ACTIVITY LOGS ──
  console.log('\n── ACTIVITY LOGS ──');
  await test('GET /activity-logs', async () => {
    const res = await request('GET', '/activity-logs');
    return expect(res, { status: 200 });
  });

  await test('GET /activity-logs/recent', async () => {
    const res = await request('GET', '/activity-logs/recent');
    return expect(res, { status: 200 });
  });

  // ── ACCOUNTING ──
  console.log('\n── ACCOUNTING ──');
  await test('GET /accounting/categories', async () => {
    const res = await request('GET', '/accounting/categories');
    return expect(res, { status: 200 });
  });

  await test('GET /accounting/transactions', async () => {
    const res = await request('GET', '/accounting/transactions');
    return expect(res, { status: 200 });
  });

  await test('GET /accounting/installments', async () => {
    const res = await request('GET', '/accounting/installments');
    return expect(res, { status: 200 });
  });

  await test('GET /accounting/company/summary', async () => {
    const res = await request('GET', '/accounting/company/summary');
    return expect(res, { status: 200 });
  });

  await test('GET /accounting/export', async () => {
    const res = await request('GET', '/accounting/export');
    return expect(res, { status: 200 });
  });

  // ── QUOTATIONS ──
  console.log('\n── QUOTATIONS ──');
  await test('GET /quotations', async () => {
    const res = await request('GET', '/quotations');
    return expect(res, { status: 200 });
  });

  await test('POST /quotations (create)', async () => {
    if (!createdIds.customer) return { pass: false, ms: 0, detail: 'no customer' };
    const res = await request('POST', '/quotations', {
      customer_id: createdIds.customer,
      items: [{ description: 'Test Item', quantity: 1, unit: 'ชิ้น', unit_price: 1000, amount: 1000 }],
    });
    if (res.json?.id) createdIds.quotation = res.json.id;
    if (res.json?.quotationId) createdIds.quotation = res.json.quotationId;
    return expect(res, { minStatus: 200, maxStatus: 201 });
  });

  // ── CONTRACTS ──
  console.log('\n── CONTRACTS ──');
  await test('GET /contracts', async () => {
    const res = await request('GET', '/contracts');
    return expect(res, { status: 200 });
  });

  await test('POST /contracts (create)', async () => {
    const res = await request('POST', '/contracts', {
      contract_number: `SMOKE-${Date.now()}`,
    });
    if (res.json?.id) createdIds.contract = res.json.id;
    if (res.json?.contractId) createdIds.contract = res.json.contractId;
    return expect(res, { minStatus: 200, maxStatus: 201 });
  });

  // ── SETTINGS ──
  console.log('\n── SETTINGS ──');
  await test('GET /settings/company', async () => {
    const res = await request('GET', '/settings/company');
    return expect(res, { status: 200 });
  });

  await test('GET /settings/changelog', async () => {
    const res = await request('GET', '/settings/changelog');
    return expect(res, { status: 200 });
  });

  // ── BACKUP ──
  console.log('\n── BACKUP ──');
  await test('GET /backup', async () => {
    const res = await request('GET', '/backup');
    return expect(res, { status: 200 });
  });

  await test('POST /backup (create)', async () => {
    const res = await request('POST', '/backup');
    if (res.json?.name) createdIds.backup = res.json.name;
    return expect(res, { minStatus: 200, maxStatus: 201 });
  });

  // ── CLEANUP ──
  console.log('\n── CLEANUP ──');
  if (createdIds.task) {
    await test('DELETE /tasks/:id', async () => {
      const res = await request('DELETE', `/tasks/${createdIds.task}`);
      return expect(res, { status: 200 });
    });
  }
  if (createdIds.quotation) {
    await test('DELETE /quotations/:id', async () => {
      const res = await request('DELETE', `/quotations/${createdIds.quotation}`);
      return expect(res, { status: 200 });
    });
  }
  if (createdIds.contract) {
    await test('DELETE /contracts/:id', async () => {
      const res = await request('DELETE', `/contracts/${createdIds.contract}`);
      return expect(res, { status: 200 });
    });
  }
  if (createdIds.project) {
    await test('DELETE /projects/:id', async () => {
      const res = await request('DELETE', `/projects/${createdIds.project}`);
      return expect(res, { status: 200 });
    });
  }
  if (createdIds.user) {
    await test('DELETE /users/:id', async () => {
      const res = await request('DELETE', `/users/${createdIds.user}`);
      return expect(res, { status: 200 });
    });
  }
  if (createdIds.customer) {
    await test('DELETE /customers/:id', async () => {
      const res = await request('DELETE', `/customers/${createdIds.customer}`);
      return expect(res, { status: 200 });
    });
  }
  if (createdIds.backup) {
    await test('DELETE /backup/:name', async () => {
      const res = await request('DELETE', `/backup/${encodeURIComponent(createdIds.backup)}`);
      return expect(res, { status: 200 });
    });
  }

  // ── LOGOUT ──
  console.log('\n── LOGOUT ──');
  await test('POST /auth/logout', async () => {
    if (!refreshToken) return { pass: false, ms: 0, detail: 'no refreshToken' };
    const res = await request('POST', '/auth/logout', { refreshToken }, { noAuth: true });
    return expect(res, { status: 200 });
  });

  // ── SUMMARY ──
  const totalTime = Date.now() - totalStart;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const errors = results.filter((r) => r.status === 'ERROR').length;

  console.log('\n========================================');
  console.log(`  Total: ${results.length} | PASS: ${passed} | FAIL: ${failed} | ERROR: ${errors}`);
  console.log(`  Time: ${(totalTime / 1000).toFixed(1)}s`);
  console.log('========================================');

  if (failed + errors > 0) {
    console.log('\nFailed tests:');
    results.filter((r) => r.status !== 'PASS').forEach((r) => {
      console.log(`  [${r.status}] ${r.name} - ${r.detail}`);
    });
  }

  process.exit(failed + errors > 0 ? 1 : 0);
}

run().catch((err) => { console.error('Fatal:', err); process.exit(1); });

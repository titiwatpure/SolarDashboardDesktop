const request = require('supertest');
const app = require('../src/index');

let authToken;
let projectId;

beforeAll(async () => {
  // Login to get token
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin' });
  authToken = res.body.token || res.body.accessToken;
});

describe('Projects API', () => {
  describe('GET /api/projects', () => {
    it('should list projects with auth', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/projects/stats/kpis', () => {
    it('should return KPI stats', async () => {
      const res = await request(app)
        .get('/api/projects/stats/kpis')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_name: 'Test Solar Project',
          project_code: 'TEST-001',
          size_kw: 100,
          size_kva: 125,
          province: 'กรุงเทพมหานคร'
        });

      expect(res.status).toBe(201);
      expect(res.body.project_name).toBe('Test Solar Project');
      projectId = res.body.id;
    });

    it('should reject duplicate project code', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          project_name: 'Duplicate Project',
          project_code: 'TEST-001',
          size_kw: 50,
          province: 'กรุงเทพมหานคร'
        });

      expect(res.status).toBe(400);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ project_name: 'Incomplete' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should get project by id', async () => {
      if (!projectId) return;

      const res = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(projectId);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project', async () => {
      if (!projectId) return;

      const res = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ project_name: 'Updated Solar Project' });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project', async () => {
      if (!projectId) return;

      const res = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });
});

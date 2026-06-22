const request = require('supertest');
const app = require('../src/index');

let authToken;

beforeAll(async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin' });
  authToken = res.body.token || res.body.accessToken;
});

describe('Organizations API', () => {
  describe('GET /api/organizations', () => {
    it('should list organizations', async () => {
      const res = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toHaveProperty('total');
    });
  });

  describe('POST /api/organizations', () => {
    let orgId;

    it('should create organization', async () => {
      const res = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          org_name: 'Test Organization',
          org_type: 'pea'
        });

      expect(res.status).toBe(201);
      orgId = res.body.id;
    });

    it('should update organization', async () => {
      if (!orgId) return;

      const res = await request(app)
        .put(`/api/organizations/${orgId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ org_name: 'Updated Organization' });

      expect(res.status).toBe(200);
    });

    it('should delete organization', async () => {
      if (!orgId) return;

      const res = await request(app)
        .delete(`/api/organizations/${orgId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });
});

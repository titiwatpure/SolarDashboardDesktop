const request = require('supertest');
const app = require('../src/index');

describe('Health Check', () => {
  it('GET /api/health — should return OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.message).toBe('Server is running');
  });
});

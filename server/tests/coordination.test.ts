import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';

const app = createApp();

describe('Coordination & Alerts API', () => {
  beforeAll(async () => {
    await db.initialize();
  });

  it('GET /api/coordination/alerts returns operational alerts', async () => {
    const res = await request(app).get('/api/coordination/alerts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/coordination/dashboard-summary returns KPI metrics', async () => {
    const res = await request(app).get('/api/coordination/dashboard-summary');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('overview');
    expect(res.body.overview).toHaveProperty('total_tasks');
    expect(res.body).toHaveProperty('optimization_comparison');
    expect(res.body).toHaveProperty('department_distribution');
  });

  it('GET /api/coordination/dependency-graph returns nodes and edges', async () => {
    const res = await request(app).get('/api/coordination/dependency-graph');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('nodes');
    expect(res.body).toHaveProperty('edges');
    expect(Array.isArray(res.body.nodes)).toBe(true);
    expect(Array.isArray(res.body.edges)).toBe(true);
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/db/index.js';

const app = createApp();

describe('Task Management API (Express + Zod)', () => {
  beforeAll(async () => {
    await db.initialize();
    await request(app).post('/api/tasks/reset-sample-data');
  });

  it('GET /health returns healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.server).toBe('Express.js');
  });

  it('GET /api/tasks returns all maintenance tasks', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('department');
  });

  it('GET /api/tasks?department=Track filters tasks by department', async () => {
    const res = await request(app).get('/api/tasks?department=Track');
    expect(res.status).toBe(200);
    for (const t of res.body) {
      expect(t.department).toBe('Track');
    }
  });

  it('POST /api/tasks creates task with valid schema', async () => {
    const payload = {
      title: 'Automated Switch Motor Inspection',
      description: 'Routine stroke calibration of facing crossover points.',
      department: 'Signalling & Telecommunications (S&T)',
      section: 'Section B-1 (Suburban Corridor)',
      maintenance_type: 'Point Machine Maintenance',
      planned_duration_hours: 2.5,
      priority: 'High',
      resources: {
        crew_type: 'Signal Engineers Group A',
        crew_size: 4,
        equipment: ['Point Machine Drive Calibrator'],
        power_block_required: false,
      },
      crew_availability_ratio: 0.9,
      dependencies: [],
      compatible_with_simultaneous_types: [],
      planned_start_offset_hours: 1.0,
    };

    const res = await request(app).post('/api/tasks').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe(payload.title);
    expect(res.body.predicted_delay_probability).toBeDefined();

    // Clean up
    await request(app).delete(`/api/tasks/${res.body.id}`);
  });

  it('POST /api/tasks rejects invalid task with 422 Zod error', async () => {
    const invalidPayload = {
      title: 'X', // too short (< 3 chars)
      department: 'InvalidDepartment',
      planned_duration_hours: -5, // negative duration
    };

    const res = await request(app).post('/api/tasks').send(invalidPayload);
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('detail');
  });
});

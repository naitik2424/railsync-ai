import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('ML & Simulation Proxy API', () => {
  it('POST /api/predictions/predict returns delay assessment', async () => {
    const payload = {
      department: 'Track',
      maintenance_type: 'Track Relaying / Renewal',
      section: 'Section B-1 (Suburban Corridor)',
      planned_duration_hours: 6.0,
      complexity_score: 5,
      crew_experience_level: 2,
      crew_size_allocated: 6,
      crew_shortage_ratio: 0.35,
      equipment_age_years: 8,
      weather_condition: 'Rain',
      is_night_shift: 1,
      dependency_count: 2,
      historical_section_delay_rate: 0.30,
    };

    const res = await request(app).post('/api/predictions/predict').send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('delay_probability');
    expect(res.body).toHaveProperty('risk_level');
    expect(res.body).toHaveProperty('top_risk_factors');
  });

  it('GET /api/predictions/metrics returns model evaluation metrics', async () => {
    const res = await request(app).get('/api/predictions/metrics');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accuracy');
    expect(res.body).toHaveProperty('roc_auc');
    expect(res.body).toHaveProperty('feature_importances');
  });
});

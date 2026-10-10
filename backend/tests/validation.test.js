import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

test('GET /api/v1/readings/alerts rejects negative threshold with 400', async () => {
  const res = await request(app).get('/api/v1/readings/alerts?threshold=-5');
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('GET /api/v1/readings/alerts rejects threshold > 100 with 400', async () => {
  const res = await request(app).get('/api/v1/readings/alerts?threshold=150');
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST /api/v1/expenses rejects invalid expense category with 400', async () => {
  const res = await request(app).post('/api/v1/expenses').send({
    farm_id: 1,
    expense_date: '2026-10-10',
    category: 'INVALID_CATEGORY_NAME', // Not in ENUM
    amount_usd: 500,
    description: 'Invalid expense test',
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST /api/v1/expenses rejects non-positive amount with 400', async () => {
  const res = await request(app).post('/api/v1/expenses').send({
    farm_id: 1,
    expense_date: '2026-10-10',
    category: 'FERTILIZER',
    amount_usd: -50.0, // Non-positive amount
    description: 'Negative expense test',
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST /api/v1/irrigation rejects negative water_volume_liters with 400', async () => {
  const res = await request(app).post('/api/v1/irrigation').send({
    field_id: 1,
    start_time: '2026-10-10 08:00:00',
    water_volume_liters: -500,
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST /api/v1/harvests rejects negative yield_quantity_kg with 400', async () => {
  const res = await request(app).post('/api/v1/harvests').send({
    planting_id: 1,
    harvest_date: '2026-10-10',
    yield_quantity_kg: -100,
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST /api/v1/fields rejects non-positive area_hectares with 400', async () => {
  const res = await request(app).post('/api/v1/fields').send({
    farm_id: 1,
    field_name: 'Invalid Plot',
    area_hectares: 0, // Must be > 0
    soil_type: 'Clay Loam',
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

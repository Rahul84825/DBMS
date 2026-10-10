import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { closePool } from '../src/config/database.js';

test.after(async () => {
  await closePool();
});

test('GET /api/health returns health status', async () => {
  const res = await request(app).get('/api/health');
  assert.ok([200, 503].includes(res.status), `Unexpected status: ${res.status}`);
  assert.ok(['healthy', 'degraded'].includes(res.body.status));
  assert.ok(res.body.service.includes('Smart Farm'));
  assert.ok(res.body.database);
});

test('GET /api returns API catalog and endpoints list', async () => {
  const res = await request(app).get('/api');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data.endpoints));
  assert.ok(res.body.data.endpoints.includes('/api/v1/farms'));
  assert.ok(res.body.data.endpoints.includes('/api/v1/dashboard/summary'));
});

test('GET /api/v1/nonexistent returns 404 error response', async () => {
  const res = await request(app).get('/api/v1/nonexistent');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});

test('POST /api/v1/farms fails with 400 when missing required fields', async () => {
  const res = await request(app).post('/api/v1/farms').send({});
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(res.body.error.details));
});

test('POST /api/v1/farms fails with 400 on negative area_hectares', async () => {
  const res = await request(app).post('/api/v1/farms').send({
    farm_name: 'Invalid Acres',
    owner_name: 'John Doe',
    location: 'Somewhere',
    total_area_hectares: -15.5,
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  const areaIssue = res.body.error.details.find((d) => d.field.includes('total_area_hectares'));
  assert.ok(areaIssue, 'Expected error detail on total_area_hectares');
});

test('GET /api/v1/farms/:id fails with 400 on non-numeric ID', async () => {
  const res = await request(app).get('/api/v1/farms/invalid-id');
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST /api/v1/readings fails with 400 when neither sensor_id nor sensor_code is provided', async () => {
  const res = await request(app).post('/api/v1/readings').send({
    reading_value: 45.5,
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('POST /api/v1/crops fails with 400 if optimal_soil_moisture_max < min', async () => {
  const res = await request(app).post('/api/v1/crops').send({
    crop_name: 'Test Crop',
    variety: 'Test Variety',
    optimal_soil_moisture_min: 70.0,
    optimal_soil_moisture_max: 30.0, // Invalid: max < min
    optimal_temp_celsius_min: 15.0,
    optimal_temp_celsius_max: 25.0,
    growth_duration_days: 90,
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('CORS headers are properly applied', async () => {
  const res = await request(app).get('/api/health').set('Origin', 'http://localhost:3000');
  assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:3000');
});

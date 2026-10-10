import { Router } from 'express';
import { query } from '../config/database.js';
import { validate } from '../middleware/validate.js';
import { createReadingSchema, queryReadingsSchema, alertThresholdSchema } from '../validators/entity.validators.js';
import { success, created, paginated } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/readings/latest (Retrieve latest reading per sensor across all farms)
router.get('/latest', async (req, res, next) => {
  try {
    // Uses the optimized latest-reading subquery
    const sql = `
      SELECT 
        s.sensor_id,
        s.sensor_code,
        s.sensor_type,
        s.unit_of_measurement,
        s.status AS sensor_status,
        f.field_id,
        f.field_name,
        fm.farm_id,
        fm.farm_name,
        sr.reading_id,
        sr.reading_value,
        sr.recorded_at,
        sr.data_source,
        sr.is_valid
      FROM sensor s
      INNER JOIN field f ON s.field_id = f.field_id
      INNER JOIN farm fm ON f.farm_id = fm.farm_id
      INNER JOIN (
        SELECT sensor_id, MAX(reading_id) AS max_reading_id
        FROM sensor_reading
        WHERE is_valid = TRUE
        GROUP BY sensor_id
      ) latest ON s.sensor_id = latest.sensor_id
      INNER JOIN sensor_reading sr ON latest.max_reading_id = sr.reading_id
      ORDER BY s.sensor_code ASC
    `;

    const latestReadings = await query(sql);
    return success(res, latestReadings, 'Latest sensor readings retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/readings/alerts (Low soil moisture alert detection with configurable threshold)
router.get('/alerts', validate({ query: alertThresholdSchema }), async (req, res, next) => {
  try {
    const threshold = req.query.threshold !== undefined ? Number(req.query.threshold) : 30.0;

    const sql = `
      SELECT 
        fm.farm_name,
        f.field_name,
        s.sensor_id,
        s.sensor_code,
        sr.reading_value AS latest_soil_moisture_pct,
        ? AS alert_threshold_pct,
        sr.recorded_at AS timestamp_recorded,
        'ALERT: SOIL MOISTURE DEFICIT' AS advisory_notice,
        'RECOMMENDATION: REVIEW IRRIGATION SCHEDULE' AS system_advice
      FROM sensor_reading sr
      INNER JOIN sensor s ON sr.sensor_id = s.sensor_id
      INNER JOIN field f ON s.field_id = f.field_id
      INNER JOIN farm fm ON f.farm_id = fm.farm_id
      INNER JOIN (
        -- Subquery ensuring we evaluate ONLY the latest reading per soil moisture sensor
        SELECT sensor_id, MAX(reading_id) AS max_reading_id
        FROM sensor_reading
        WHERE is_valid = TRUE
        GROUP BY sensor_id
      ) latest ON s.sensor_id = latest.sensor_id AND sr.reading_id = latest.max_reading_id
      WHERE s.sensor_type = 'SOIL_MOISTURE'
        AND sr.reading_value < ?
      ORDER BY sr.reading_value ASC
    `;

    const alerts = await query(sql, [threshold, threshold]);
    return success(
      res,
      alerts,
      `Identified ${alerts.length} soil moisture deficit alert(s) below ${threshold}% threshold`,
      200,
      {
        thresholdUsed: threshold,
        note: 'Threshold is an illustrative demonstration value, not a universal agronomic recommendation.',
      }
    );
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/readings (List historical readings with filters and pagination)
router.get('/', validate({ query: queryReadingsSchema }), async (req, res, next) => {
  try {
    const { page, limit, sensor_id, sensor_type, field_id, data_source, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        sr.*, 
        s.sensor_code, 
        s.sensor_type, 
        s.unit_of_measurement, 
        f.field_name
      FROM sensor_reading sr
      INNER JOIN sensor s ON sr.sensor_id = s.sensor_id
      INNER JOIN field f ON s.field_id = f.field_id
    `;
    let countSql = `
      SELECT COUNT(*) AS total 
      FROM sensor_reading sr
      INNER JOIN sensor s ON sr.sensor_id = s.sensor_id
    `;

    const conditions = [];
    const params = [];
    const countParams = [];

    if (sensor_id) {
      conditions.push('sr.sensor_id = ?');
      params.push(sensor_id);
      countParams.push(sensor_id);
    }

    if (sensor_type) {
      conditions.push('s.sensor_type = ?');
      params.push(sensor_type);
      countParams.push(sensor_type);
    }

    if (field_id) {
      conditions.push('s.field_id = ?');
      params.push(field_id);
      countParams.push(field_id);
    }

    if (data_source) {
      conditions.push('sr.data_source = ?');
      params.push(data_source);
      countParams.push(data_source);
    }

    if (startDate) {
      conditions.push('sr.recorded_at >= ?');
      params.push(startDate);
      countParams.push(startDate);
    }

    if (endDate) {
      conditions.push('sr.recorded_at <= ?');
      params.push(endDate);
      countParams.push(endDate);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      sql += whereClause;
      countSql += whereClause;
    }

    sql += ' ORDER BY sr.recorded_at DESC, sr.reading_id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [readings, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, countParams),
    ]);

    const total = countResult[0]?.total || 0;
    return paginated(res, readings, { page, limit, total }, 'Readings retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/readings (Ingest telemetry reading)
router.post('/', validate({ body: createReadingSchema }), async (req, res, next) => {
  try {
    let { sensor_id, sensor_code, reading_value, recorded_at, data_source, is_valid } = req.body;

    // Resolve sensor_code to sensor_id if needed
    if (!sensor_id && sensor_code) {
      const sensorRows = await query('SELECT sensor_id, sensor_type FROM sensor WHERE sensor_code = ?', [sensor_code]);
      if (sensorRows.length === 0) {
        throw new AppError(`Sensor with code '${sensor_code}' does not exist`, 400, 'SENSOR_NOT_FOUND');
      }
      sensor_id = sensorRows[0].sensor_id;
    } else {
      const sensorRows = await query('SELECT sensor_id, sensor_type FROM sensor WHERE sensor_id = ?', [sensor_id]);
      if (sensorRows.length === 0) {
        throw new AppError(`Sensor with ID ${sensor_id} does not exist`, 400, 'SENSOR_NOT_FOUND');
      }
      // Check physical moisture range validity
      if (sensorRows[0].sensor_type === 'SOIL_MOISTURE' && (reading_value < 0 || reading_value > 100)) {
        throw new AppError('Soil moisture readings must be between 0% and 100%', 400, 'INVALID_MOISTURE_RANGE');
      }
    }

    const timestampVal = recorded_at ? new Date(recorded_at) : new Date();

    const insertResult = await query(
      `INSERT INTO sensor_reading (sensor_id, recorded_at, reading_value, data_source, is_valid)
       VALUES (?, ?, ?, ?, ?)`,
      [sensor_id, timestampVal, reading_value, data_source || 'SIMULATED', is_valid !== undefined ? is_valid : true]
    );

    const insertedReading = await query(
      `SELECT sr.*, s.sensor_code, s.sensor_type, s.unit_of_measurement
       FROM sensor_reading sr
       INNER JOIN sensor s ON sr.sensor_id = s.sensor_id
       WHERE sr.reading_id = ?`,
      [insertResult.insertId]
    );

    return created(res, insertedReading[0], 'Sensor reading ingested successfully');
  } catch (error) {
    next(error);
  }
});

export default router;

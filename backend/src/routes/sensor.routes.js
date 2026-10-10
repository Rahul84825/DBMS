import { Router } from 'express';
import { query } from '../config/database.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema, paginationQuerySchema } from '../validators/common.validator.js';
import { createSensorSchema, updateSensorSchema } from '../validators/entity.validators.js';
import { success, created, paginated } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/sensors (List sensors with location joins and filters)
router.get('/', validate({ query: paginationQuerySchema }), async (req, res, next) => {
  try {
    const { page, limit, field_id, sensor_type, status, search } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        s.*, 
        f.field_name, 
        fm.farm_id,
        fm.farm_name
      FROM sensor s
      INNER JOIN field f ON s.field_id = f.field_id
      INNER JOIN farm fm ON f.farm_id = fm.farm_id
    `;
    let countSql = `SELECT COUNT(*) AS total FROM sensor s INNER JOIN field f ON s.field_id = f.field_id INNER JOIN farm fm ON f.farm_id = fm.farm_id`;
    const conditions = [];
    const params = [];
    const countParams = [];

    if (field_id) {
      conditions.push('s.field_id = ?');
      params.push(field_id);
      countParams.push(field_id);
    }

    if (sensor_type) {
      conditions.push('s.sensor_type = ?');
      params.push(sensor_type);
      countParams.push(sensor_type);
    }

    if (status) {
      conditions.push('s.status = ?');
      params.push(status);
      countParams.push(status);
    }

    if (search) {
      conditions.push('(s.sensor_code LIKE ? OR f.field_name LIKE ? OR fm.farm_name LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
      countParams.push(pattern, pattern, pattern);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      sql += whereClause;
      countSql += whereClause;
    }

    sql += ' ORDER BY s.sensor_id ASC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [sensors, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, countParams),
    ]);

    const total = countResult[0]?.total || 0;
    return paginated(res, sensors, { page, limit, total }, 'Sensors retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/sensors/:id (Get sensor with its latest reading)
router.get('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const sensors = await query(
      `SELECT 
        s.*, 
        f.field_name, 
        fm.farm_id,
        fm.farm_name
       FROM sensor s
       INNER JOIN field f ON s.field_id = f.field_id
       INNER JOIN farm fm ON f.farm_id = fm.farm_id
       WHERE s.sensor_id = ?`,
      [id]
    );

    if (sensors.length === 0) {
      throw new AppError(`Sensor with ID ${id} not found`, 404, 'SENSOR_NOT_FOUND');
    }

    // Get latest reading and total reading count
    const [latestReading, countResult] = await Promise.all([
      query(
        'SELECT * FROM sensor_reading WHERE sensor_id = ? ORDER BY recorded_at DESC, reading_id DESC LIMIT 1',
        [id]
      ),
      query('SELECT COUNT(*) AS total_readings FROM sensor_reading WHERE sensor_id = ?', [id]),
    ]);

    const sensorData = {
      ...sensors[0],
      total_readings: countResult[0]?.total_readings || 0,
      latest_reading: latestReading[0] || null,
    };

    return success(res, sensorData, 'Sensor details retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/sensors (Register new sensor)
router.post('/', validate({ body: createSensorSchema }), async (req, res, next) => {
  try {
    const { field_id, sensor_code, sensor_type, unit_of_measurement, status, installation_date } = req.body;

    const fieldExists = await query('SELECT field_id FROM field WHERE field_id = ?', [field_id]);
    if (fieldExists.length === 0) {
      throw new AppError(`Field ID ${field_id} does not exist`, 400, 'FIELD_NOT_FOUND');
    }

    const result = await query(
      `INSERT INTO sensor (field_id, sensor_code, sensor_type, unit_of_measurement, status, installation_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [field_id, sensor_code, sensor_type, unit_of_measurement, status || 'ACTIVE', installation_date]
    );

    const newSensor = await query('SELECT * FROM sensor WHERE sensor_id = ?', [result.insertId]);
    return created(res, newSensor[0], 'Sensor registered successfully');
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/sensors/:id (Update sensor)
router.put('/:id', validate({ params: idParamSchema, body: updateSensorSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM sensor WHERE sensor_id = ?', [id]);
    if (existing.length === 0) {
      throw new AppError(`Sensor with ID ${id} not found`, 404, 'SENSOR_NOT_FOUND');
    }

    const updates = [];
    const params = [];
    const allowed = ['field_id', 'sensor_code', 'sensor_type', 'unit_of_measurement', 'status', 'installation_date'];

    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(req.body[f]);
      }
    }

    if (updates.length === 0) {
      return success(res, existing[0], 'No changes requested');
    }

    params.push(id);
    await query(`UPDATE sensor SET ${updates.join(', ')} WHERE sensor_id = ?`, params);

    const updated = await query('SELECT * FROM sensor WHERE sensor_id = ?', [id]);
    return success(res, updated[0], 'Sensor updated successfully');
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/sensors/:id (Safe single-record deletion)
router.delete('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM sensor WHERE sensor_id = ?', [id]);
    if (existing.length === 0) {
      throw new AppError(`Sensor with ID ${id} not found`, 404, 'SENSOR_NOT_FOUND');
    }

    await query('DELETE FROM sensor WHERE sensor_id = ?', [id]);
    return success(res, { deletedId: Number(id) }, 'Sensor deleted successfully');
  } catch (error) {
    next(error);
  }
});

export default router;

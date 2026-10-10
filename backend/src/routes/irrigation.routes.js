import { Router } from 'express';
import { query } from '../config/database.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema, paginationQuerySchema } from '../validators/common.validator.js';
import { createIrrigationSchema, updateIrrigationSchema } from '../validators/entity.validators.js';
import { success, created, paginated } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/irrigation (List events with field joins, filter by field_id, pagination)
router.get('/', validate({ query: paginationQuerySchema }), async (req, res, next) => {
  try {
    const { page, limit, field_id } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        i.*, 
        f.field_name, 
        fm.farm_name
      FROM irrigation i
      INNER JOIN field f ON i.field_id = f.field_id
      INNER JOIN farm fm ON f.farm_id = fm.farm_id
    `;
    let countSql = `SELECT COUNT(*) AS total FROM irrigation i`;
    const params = [];
    const countParams = [];

    if (field_id) {
      sql += ' WHERE i.field_id = ?';
      countSql += ' WHERE i.field_id = ?';
      params.push(field_id);
      countParams.push(field_id);
    }

    sql += ' ORDER BY i.start_time DESC, i.irrigation_id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [events, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, countParams),
    ]);

    const total = countResult[0]?.total || 0;
    return paginated(res, events, { page, limit, total }, 'Irrigation events retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/irrigation (Log irrigation event)
router.post('/', validate({ body: createIrrigationSchema }), async (req, res, next) => {
  try {
    const { field_id, start_time, end_time, water_volume_liters, irrigation_method, trigger_reason, notes } = req.body;

    const fieldExists = await query('SELECT field_id FROM field WHERE field_id = ?', [field_id]);
    if (fieldExists.length === 0) {
      throw new AppError(`Field ID ${field_id} does not exist`, 400, 'FIELD_NOT_FOUND');
    }

    const result = await query(
      `INSERT INTO irrigation (field_id, start_time, end_time, water_volume_liters, irrigation_method, trigger_reason, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [field_id, start_time, end_time || null, water_volume_liters, irrigation_method || 'DRIP', trigger_reason || 'LOW_MOISTURE_ALERT', notes || null]
    );

    const newEvent = await query('SELECT * FROM irrigation WHERE irrigation_id = ?', [result.insertId]);
    return created(res, newEvent[0], 'Irrigation event logged successfully');
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/irrigation/:id (Update event)
router.put('/:id', validate({ params: idParamSchema, body: updateIrrigationSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM irrigation WHERE irrigation_id = ?', [id]);
    if (existing.length === 0) {
      throw new AppError(`Irrigation event ID ${id} not found`, 404, 'IRRIGATION_NOT_FOUND');
    }

    const updates = [];
    const params = [];
    const allowed = ['field_id', 'start_time', 'end_time', 'water_volume_liters', 'irrigation_method', 'trigger_reason', 'notes'];

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
    await query(`UPDATE irrigation SET ${updates.join(', ')} WHERE irrigation_id = ?`, params);

    const updated = await query('SELECT * FROM irrigation WHERE irrigation_id = ?', [id]);
    return success(res, updated[0], 'Irrigation event updated successfully');
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/irrigation/:id (Delete event)
router.delete('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM irrigation WHERE irrigation_id = ?', [id]);
    if (existing.length === 0) {
      throw new AppError(`Irrigation event ID ${id} not found`, 404, 'IRRIGATION_NOT_FOUND');
    }

    await query('DELETE FROM irrigation WHERE irrigation_id = ?', [id]);
    return success(res, { deletedId: Number(id) }, 'Irrigation event deleted successfully');
  } catch (error) {
    next(error);
  }
});

export default router;

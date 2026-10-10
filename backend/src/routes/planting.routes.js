import { Router } from 'express';
import { query } from '../config/database.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema, paginationQuerySchema } from '../validators/common.validator.js';
import { createPlantingSchema, updatePlantingSchema } from '../validators/entity.validators.js';
import { success, created, paginated } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/plantings (List with multi-table joins, filters, and pagination)
router.get('/', validate({ query: paginationQuerySchema }), async (req, res, next) => {
  try {
    const { page, limit, field_id, crop_id, status } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        p.*, 
        f.field_name, 
        fm.farm_name,
        c.crop_name, 
        c.variety AS crop_variety
      FROM planting p
      INNER JOIN field f ON p.field_id = f.field_id
      INNER JOIN farm fm ON f.farm_id = fm.farm_id
      INNER JOIN crop c ON p.crop_id = c.crop_id
    `;
    let countSql = `SELECT COUNT(*) AS total FROM planting p`;
    const conditions = [];
    const params = [];
    const countParams = [];

    if (field_id) {
      conditions.push('p.field_id = ?');
      params.push(field_id);
      countParams.push(field_id);
    }

    if (crop_id) {
      conditions.push('p.crop_id = ?');
      params.push(crop_id);
      countParams.push(crop_id);
    }

    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
      countParams.push(status);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      sql += whereClause;
      countSql += whereClause;
    }

    sql += ' ORDER BY p.planting_date DESC, p.planting_id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [plantings, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, countParams),
    ]);

    const total = countResult[0]?.total || 0;
    return paginated(res, plantings, { page, limit, total }, 'Plantings retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/plantings/:id (Get planting with harvest records)
router.get('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const plantings = await query(
      `SELECT 
        p.*, 
        f.field_name, 
        f.soil_type,
        fm.farm_name,
        fm.owner_name,
        c.crop_name, 
        c.variety AS crop_variety,
        c.optimal_soil_moisture_min,
        c.optimal_soil_moisture_max
       FROM planting p
       INNER JOIN field f ON p.field_id = f.field_id
       INNER JOIN farm fm ON f.farm_id = fm.farm_id
       INNER JOIN crop c ON p.crop_id = c.crop_id
       WHERE p.planting_id = ?`,
      [id]
    );

    if (plantings.length === 0) {
      throw new AppError(`Planting cycle with ID ${id} not found`, 404, 'PLANTING_NOT_FOUND');
    }

    const harvests = await query(
      'SELECT * FROM harvest WHERE planting_id = ? ORDER BY harvest_date DESC',
      [id]
    );

    return success(res, { ...plantings[0], harvests }, 'Planting details retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/plantings (Create planting cycle)
router.post('/', validate({ body: createPlantingSchema }), async (req, res, next) => {
  try {
    const { field_id, crop_id, planting_date, expected_harvest_date, status, planted_area_hectares, notes } = req.body;

    // Verify field and crop exist
    const [fieldExists, cropExists] = await Promise.all([
      query('SELECT field_id FROM field WHERE field_id = ?', [field_id]),
      query('SELECT crop_id FROM crop WHERE crop_id = ?', [crop_id]),
    ]);

    if (fieldExists.length === 0) {
      throw new AppError(`Field ID ${field_id} does not exist`, 400, 'FIELD_NOT_FOUND');
    }
    if (cropExists.length === 0) {
      throw new AppError(`Crop ID ${crop_id} does not exist`, 400, 'CROP_NOT_FOUND');
    }

    const result = await query(
      `INSERT INTO planting (
        field_id, crop_id, planting_date, expected_harvest_date, status, planted_area_hectares, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        field_id,
        crop_id,
        planting_date,
        expected_harvest_date || null,
        status || 'GROWING',
        planted_area_hectares,
        notes || null,
      ]
    );

    const newPlanting = await query('SELECT * FROM planting WHERE planting_id = ?', [result.insertId]);
    return created(res, newPlanting[0], 'Planting cycle recorded successfully');
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/plantings/:id (Update planting)
router.put('/:id', validate({ params: idParamSchema, body: updatePlantingSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM planting WHERE planting_id = ?', [id]);
    if (existing.length === 0) {
      throw new AppError(`Planting cycle with ID ${id} not found`, 404, 'PLANTING_NOT_FOUND');
    }

    const updates = [];
    const params = [];
    const allowed = ['field_id', 'crop_id', 'planting_date', 'expected_harvest_date', 'status', 'planted_area_hectares', 'notes'];

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
    await query(`UPDATE planting SET ${updates.join(', ')} WHERE planting_id = ?`, params);

    const updated = await query('SELECT * FROM planting WHERE planting_id = ?', [id]);
    return success(res, updated[0], 'Planting cycle updated successfully');
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/plantings/:id (Safe single-record deletion)
router.delete('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM planting WHERE planting_id = ?', [id]);
    if (existing.length === 0) {
      throw new AppError(`Planting cycle with ID ${id} not found`, 404, 'PLANTING_NOT_FOUND');
    }

    const harvests = await query('SELECT COUNT(*) AS count FROM harvest WHERE planting_id = ?', [id]);
    const hCount = harvests[0]?.count || 0;

    if (hCount > 0) {
      throw new AppError(
        `Cannot delete planting ID ${id}: it has ${hCount} linked harvest record(s). Delete related harvests first.`,
        409,
        'FOREIGN_KEY_CONFLICT'
      );
    }

    await query('DELETE FROM planting WHERE planting_id = ?', [id]);
    return success(res, { deletedId: Number(id) }, 'Planting cycle deleted successfully');
  } catch (error) {
    next(error);
  }
});

export default router;

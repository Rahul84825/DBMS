import { Router } from 'express';
import { query } from '../config/database.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema, paginationQuerySchema } from '../validators/common.validator.js';
import { createCropSchema, updateCropSchema } from '../validators/entity.validators.js';
import { success, created, paginated } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/crops (List crops with pagination and search)
router.get('/', validate({ query: paginationQuerySchema }), async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM crop';
    let countSql = 'SELECT COUNT(*) AS total FROM crop';
    const params = [];
    const countParams = [];

    if (search) {
      const pattern = `%${search}%`;
      sql += ' WHERE crop_name LIKE ? OR variety LIKE ?';
      countSql += ' WHERE crop_name LIKE ? OR variety LIKE ?';
      params.push(pattern, pattern);
      countParams.push(pattern, pattern);
    }

    sql += ' ORDER BY crop_name ASC, variety ASC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [crops, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, countParams),
    ]);

    const total = countResult[0]?.total || 0;
    return paginated(res, crops, { page, limit, total }, 'Crops retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/crops/:id (Get crop by ID with associated plantings)
router.get('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const crops = await query('SELECT * FROM crop WHERE crop_id = ?', [id]);
    if (crops.length === 0) {
      throw new AppError(`Crop with ID ${id} not found`, 404, 'CROP_NOT_FOUND');
    }

    const plantings = await query(
      `SELECT p.*, f.field_name, fm.farm_name 
       FROM planting p 
       INNER JOIN field f ON p.field_id = f.field_id 
       INNER JOIN farm fm ON f.farm_id = fm.farm_id 
       WHERE p.crop_id = ? 
       ORDER BY p.planting_date DESC`,
      [id]
    );

    return success(res, { ...crops[0], plantings }, 'Crop details retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/crops (Create crop)
router.post('/', validate({ body: createCropSchema }), async (req, res, next) => {
  try {
    const {
      crop_name,
      variety,
      optimal_soil_moisture_min,
      optimal_soil_moisture_max,
      optimal_temp_celsius_min,
      optimal_temp_celsius_max,
      growth_duration_days,
    } = req.body;

    const result = await query(
      `INSERT INTO crop (
        crop_name, variety, optimal_soil_moisture_min, optimal_soil_moisture_max,
        optimal_temp_celsius_min, optimal_temp_celsius_max, growth_duration_days
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        crop_name,
        variety || 'Standard',
        optimal_soil_moisture_min,
        optimal_soil_moisture_max,
        optimal_temp_celsius_min,
        optimal_temp_celsius_max,
        growth_duration_days,
      ]
    );

    const newCrop = await query('SELECT * FROM crop WHERE crop_id = ?', [result.insertId]);
    return created(res, newCrop[0], 'Crop created successfully');
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/crops/:id (Update crop)
router.put('/:id', validate({ params: idParamSchema, body: updateCropSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM crop WHERE crop_id = ?', [id]);
    if (existing.length === 0) {
      throw new AppError(`Crop with ID ${id} not found`, 404, 'CROP_NOT_FOUND');
    }

    const updates = [];
    const params = [];
    const allowed = [
      'crop_name',
      'variety',
      'optimal_soil_moisture_min',
      'optimal_soil_moisture_max',
      'optimal_temp_celsius_min',
      'optimal_temp_celsius_max',
      'growth_duration_days',
    ];

    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return success(res, existing[0], 'No changes requested');
    }

    params.push(id);
    await query(`UPDATE crop SET ${updates.join(', ')} WHERE crop_id = ?`, params);

    const updated = await query('SELECT * FROM crop WHERE crop_id = ?', [id]);
    return success(res, updated[0], 'Crop updated successfully');
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/crops/:id (Safe single-record deletion)
router.delete('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM crop WHERE crop_id = ?', [id]);
    if (existing.length === 0) {
      throw new AppError(`Crop with ID ${id} not found`, 404, 'CROP_NOT_FOUND');
    }

    const plantings = await query('SELECT COUNT(*) AS count FROM planting WHERE crop_id = ?', [id]);
    const pCount = plantings[0]?.count || 0;

    if (pCount > 0) {
      throw new AppError(
        `Cannot delete crop ID ${id}: it is referenced by ${pCount} planting record(s). Delete or reassign related plantings first.`,
        409,
        'FOREIGN_KEY_CONFLICT'
      );
    }

    await query('DELETE FROM crop WHERE crop_id = ?', [id]);
    return success(res, { deletedId: Number(id) }, 'Crop deleted successfully');
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from 'express';
import { query } from '../config/database.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema, paginationQuerySchema } from '../validators/common.validator.js';
import { createFarmSchema, updateFarmSchema } from '../validators/entity.validators.js';
import { success, created, paginated } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/farms (List with pagination and optional search)
router.get('/', validate({ query: paginationQuerySchema }), async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM farm';
    let countSql = 'SELECT COUNT(*) AS total FROM farm';
    const params = [];
    const countParams = [];

    if (search) {
      const searchPattern = `%${search}%`;
      sql += ' WHERE farm_name LIKE ? OR owner_name LIKE ? OR location LIKE ?';
      countSql += ' WHERE farm_name LIKE ? OR owner_name LIKE ? OR location LIKE ?';
      params.push(searchPattern, searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    sql += ' ORDER BY farm_id ASC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [farms, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, countParams),
    ]);

    const total = countResult[0]?.total || 0;
    return paginated(res, farms, { page, limit, total }, 'Farms retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/farms/:id (Get single farm with its fields)
router.get('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const farms = await query('SELECT * FROM farm WHERE farm_id = ?', [id]);
    if (farms.length === 0) {
      throw new AppError(`Farm with ID ${id} not found`, 404, 'FARM_NOT_FOUND');
    }

    // Attach related fields for detailed view
    const fields = await query('SELECT * FROM field WHERE farm_id = ? ORDER BY field_id ASC', [id]);
    const farmData = {
      ...farms[0],
      fields,
    };

    return success(res, farmData, 'Farm details retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/farms (Create new farm)
router.post('/', validate({ body: createFarmSchema }), async (req, res, next) => {
  try {
    const { farm_name, owner_name, location, total_area_hectares } = req.body;
    const result = await query(
      'INSERT INTO farm (farm_name, owner_name, location, total_area_hectares) VALUES (?, ?, ?, ?)',
      [farm_name, owner_name, location, total_area_hectares]
    );

    const newFarm = await query('SELECT * FROM farm WHERE farm_id = ?', [result.insertId]);
    return created(res, newFarm[0], 'Farm registered successfully');
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/farms/:id (Update farm)
router.put('/:id', validate({ params: idParamSchema, body: updateFarmSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM farm WHERE farm_id = ?', [id]);
    if (existing.length === 0) {
      throw new AppError(`Farm with ID ${id} not found`, 404, 'FARM_NOT_FOUND');
    }

    const updates = [];
    const params = [];
    const allowedFields = ['farm_name', 'owner_name', 'location', 'total_area_hectares'];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return success(res, existing[0], 'No changes requested');
    }

    params.push(id);
    await query(`UPDATE farm SET ${updates.join(', ')} WHERE farm_id = ?`, params);

    const updated = await query('SELECT * FROM farm WHERE farm_id = ?', [id]);
    return success(res, updated[0], 'Farm updated successfully');
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/farms/:id (Safe single-record deletion)
router.delete('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM farm WHERE farm_id = ?', [id]);
    if (existing.length === 0) {
      throw new AppError(`Farm with ID ${id} not found`, 404, 'FARM_NOT_FOUND');
    }

    // Check if dependent fields or expenses exist to provide clear conflict message
    const [fields, expenses] = await Promise.all([
      query('SELECT COUNT(*) AS count FROM field WHERE farm_id = ?', [id]),
      query('SELECT COUNT(*) AS count FROM expense WHERE farm_id = ?', [id]),
    ]);

    const fieldCount = fields[0]?.count || 0;
    const expenseCount = expenses[0]?.count || 0;

    if (fieldCount > 0 || expenseCount > 0) {
      throw new AppError(
        `Cannot delete farm ID ${id}: it currently has ${fieldCount} field(s) and ${expenseCount} expense record(s). Delete or reassign related records first.`,
        409,
        'FOREIGN_KEY_CONFLICT'
      );
    }

    await query('DELETE FROM farm WHERE farm_id = ?', [id]);
    return success(res, { deletedId: Number(id) }, 'Farm deleted successfully');
  } catch (error) {
    next(error);
  }
});

export default router;

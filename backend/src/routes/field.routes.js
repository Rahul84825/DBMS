import { Router } from 'express';
import { query } from '../config/database.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema, paginationQuerySchema } from '../validators/common.validator.js';
import { createFieldSchema, updateFieldSchema } from '../validators/entity.validators.js';
import { success, created, paginated } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/fields (List with farm name join, optional farm_id filter and pagination)
router.get('/', validate({ query: paginationQuerySchema }), async (req, res, next) => {
  try {
    const { page, limit, search, farm_id } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT f.*, fm.farm_name, fm.owner_name 
      FROM field f
      INNER JOIN farm fm ON f.farm_id = fm.farm_id
    `;
    let countSql = `SELECT COUNT(*) AS total FROM field f INNER JOIN farm fm ON f.farm_id = fm.farm_id`;
    const conditions = [];
    const params = [];
    const countParams = [];

    if (farm_id) {
      conditions.push('f.farm_id = ?');
      params.push(farm_id);
      countParams.push(farm_id);
    }

    if (search) {
      conditions.push('(f.field_name LIKE ? OR f.soil_type LIKE ? OR fm.farm_name LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
      countParams.push(pattern, pattern, pattern);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      sql += whereClause;
      countSql += whereClause;
    }

    sql += ' ORDER BY f.field_id ASC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [fields, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, countParams),
    ]);

    const total = countResult[0]?.total || 0;
    return paginated(res, fields, { page, limit, total }, 'Fields retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/fields/:id (Get single field with sensors & plantings)
router.get('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = await query(
      `SELECT f.*, fm.farm_name, fm.location AS farm_location
       FROM field f 
       INNER JOIN farm fm ON f.farm_id = fm.farm_id 
       WHERE f.field_id = ?`,
      [id]
    );

    if (fields.length === 0) {
      throw new AppError(`Field with ID ${id} not found`, 404, 'FIELD_NOT_FOUND');
    }

    const [sensors, plantings] = await Promise.all([
      query('SELECT * FROM sensor WHERE field_id = ? ORDER BY sensor_id ASC', [id]),
      query(
        `SELECT p.*, c.crop_name, c.variety 
         FROM planting p 
         INNER JOIN crop c ON p.crop_id = c.crop_id 
         WHERE p.field_id = ? 
         ORDER BY p.planting_date DESC`,
        [id]
      ),
    ]);

    const fieldData = {
      ...fields[0],
      sensors,
      plantings,
    };

    return success(res, fieldData, 'Field details retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/fields (Create new field)
router.post('/', validate({ body: createFieldSchema }), async (req, res, next) => {
  try {
    const { farm_id, field_name, area_hectares, soil_type } = req.body;

    // Verify parent farm exists
    const farmExists = await query('SELECT farm_id FROM farm WHERE farm_id = ?', [farm_id]);
    if (farmExists.length === 0) {
      throw new AppError(`Farm with ID ${farm_id} does not exist`, 400, 'PARENT_FARM_NOT_FOUND');
    }

    const result = await query(
      'INSERT INTO field (farm_id, field_name, area_hectares, soil_type) VALUES (?, ?, ?, ?)',
      [farm_id, field_name, area_hectares, soil_type]
    );

    const newField = await query(
      `SELECT f.*, fm.farm_name 
       FROM field f 
       INNER JOIN farm fm ON f.farm_id = fm.farm_id 
       WHERE f.field_id = ?`,
      [result.insertId]
    );
    return created(res, newField[0], 'Field created successfully');
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/fields/:id (Update field)
router.put('/:id', validate({ params: idParamSchema, body: updateFieldSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM field WHERE field_id = ?', [id]);
    if (existing.length === 0) {
      throw new AppError(`Field with ID ${id} not found`, 404, 'FIELD_NOT_FOUND');
    }

    if (req.body.farm_id) {
      const farmExists = await query('SELECT farm_id FROM farm WHERE farm_id = ?', [req.body.farm_id]);
      if (farmExists.length === 0) {
        throw new AppError(`Farm with ID ${req.body.farm_id} does not exist`, 400, 'PARENT_FARM_NOT_FOUND');
      }
    }

    const updates = [];
    const params = [];
    const allowedFields = ['farm_id', 'field_name', 'area_hectares', 'soil_type'];

    for (const f of allowedFields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(req.body[f]);
      }
    }

    if (updates.length === 0) {
      return success(res, existing[0], 'No changes requested');
    }

    params.push(id);
    await query(`UPDATE field SET ${updates.join(', ')} WHERE field_id = ?`, params);

    const updated = await query('SELECT * FROM field WHERE field_id = ?', [id]);
    return success(res, updated[0], 'Field updated successfully');
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/fields/:id (Safe single-record deletion)
router.delete('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM field WHERE field_id = ?', [id]);
    if (existing.length === 0) {
      throw new AppError(`Field with ID ${id} not found`, 404, 'FIELD_NOT_FOUND');
    }

    // Check dependent records (sensors, plantings, irrigation)
    const [sensors, plantings, irrigations] = await Promise.all([
      query('SELECT COUNT(*) AS count FROM sensor WHERE field_id = ?', [id]),
      query('SELECT COUNT(*) AS count FROM planting WHERE field_id = ?', [id]),
      query('SELECT COUNT(*) AS count FROM irrigation WHERE field_id = ?', [id]),
    ]);

    const sCount = sensors[0]?.count || 0;
    const pCount = plantings[0]?.count || 0;
    const iCount = irrigations[0]?.count || 0;

    if (sCount > 0 || pCount > 0 || iCount > 0) {
      throw new AppError(
        `Cannot delete field ID ${id}: it has ${sCount} sensor(s), ${pCount} planting cycle(s), and ${iCount} irrigation event(s) attached. Delete or reassign related records first.`,
        409,
        'FOREIGN_KEY_CONFLICT'
      );
    }

    await query('DELETE FROM field WHERE field_id = ?', [id]);
    return success(res, { deletedId: Number(id) }, 'Field deleted successfully');
  } catch (error) {
    next(error);
  }
});

export default router;

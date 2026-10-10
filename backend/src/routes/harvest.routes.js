import { Router } from 'express';
import { query } from '../config/database.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema, paginationQuerySchema } from '../validators/common.validator.js';
import { createHarvestSchema, updateHarvestSchema } from '../validators/entity.validators.js';
import { success, created, paginated } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/harvests (List harvest entries with multi-table joins)
router.get('/', validate({ query: paginationQuerySchema }), async (req, res, next) => {
  try {
    const { page, limit, planting_id, crop_id } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        h.*, 
        c.crop_name, 
        c.variety AS crop_variety,
        f.field_name,
        fm.farm_name,
        p.planted_area_hectares
      FROM harvest h
      INNER JOIN planting p ON h.planting_id = p.planting_id
      INNER JOIN crop c ON p.crop_id = c.crop_id
      INNER JOIN field f ON p.field_id = f.field_id
      INNER JOIN farm fm ON f.farm_id = fm.farm_id
    `;
    let countSql = `SELECT COUNT(*) AS total FROM harvest h`;
    const params = [];
    const countParams = [];

    const conditions = [];
    if (planting_id) {
      conditions.push('h.planting_id = ?');
      params.push(planting_id);
      countParams.push(planting_id);
    }
    if (crop_id) {
      conditions.push('p.crop_id = ?');
      params.push(crop_id);
      countParams.push(crop_id);
    }

    if (conditions.length > 0) {
      const where = ' WHERE ' + conditions.join(' AND ');
      sql += where;
      countSql += where;
    }

    sql += ' ORDER BY h.harvest_date DESC, h.harvest_id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [harvests, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, countParams),
    ]);

    const total = countResult[0]?.total || 0;
    return paginated(res, harvests, { page, limit, total }, 'Harvest records retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/harvests (Record harvest)
router.post('/', validate({ body: createHarvestSchema }), async (req, res, next) => {
  try {
    const { planting_id, harvest_date, yield_quantity_kg, quality_grade, market_value_usd, notes } = req.body;

    const plantingExists = await query('SELECT planting_id FROM planting WHERE planting_id = ?', [planting_id]);
    if (plantingExists.length === 0) {
      throw new AppError(`Planting ID ${planting_id} does not exist`, 400, 'PLANTING_NOT_FOUND');
    }

    const result = await query(
      `INSERT INTO harvest (planting_id, harvest_date, yield_quantity_kg, quality_grade, market_value_usd, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [planting_id, harvest_date, yield_quantity_kg, quality_grade || 'A', market_value_usd || null, notes || null]
    );

    const newHarvest = await query('SELECT * FROM harvest WHERE harvest_id = ?', [result.insertId]);
    return created(res, newHarvest[0], 'Harvest recorded successfully');
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/harvests/:id (Update harvest)
router.put('/:id', validate({ params: idParamSchema, body: updateHarvestSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM harvest WHERE harvest_id = ?', [id]);
    if (existing.length === 0) {
      throw new AppError(`Harvest record ID ${id} not found`, 404, 'HARVEST_NOT_FOUND');
    }

    const updates = [];
    const params = [];
    const allowed = ['planting_id', 'harvest_date', 'yield_quantity_kg', 'quality_grade', 'market_value_usd', 'notes'];

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
    await query(`UPDATE harvest SET ${updates.join(', ')} WHERE harvest_id = ?`, params);

    const updated = await query('SELECT * FROM harvest WHERE harvest_id = ?', [id]);
    return success(res, updated[0], 'Harvest updated successfully');
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/harvests/:id (Delete harvest)
router.delete('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM harvest WHERE harvest_id = ?', [id]);
    if (existing.length === 0) {
      throw new AppError(`Harvest record ID ${id} not found`, 404, 'HARVEST_NOT_FOUND');
    }

    await query('DELETE FROM harvest WHERE harvest_id = ?', [id]);
    return success(res, { deletedId: Number(id) }, 'Harvest record deleted successfully');
  } catch (error) {
    next(error);
  }
});

export default router;

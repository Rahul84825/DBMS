import { Router } from 'express';
import { query } from '../config/database.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema, paginationQuerySchema } from '../validators/common.validator.js';
import { createExpenseSchema, updateExpenseSchema } from '../validators/entity.validators.js';
import { success, created, paginated } from '../utils/response.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/v1/expenses (List expenses with farm and field joins, filters)
router.get('/', validate({ query: paginationQuerySchema }), async (req, res, next) => {
  try {
    const { page, limit, farm_id, category, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        e.*, 
        fm.farm_name, 
        f.field_name
      FROM expense e
      INNER JOIN farm fm ON e.farm_id = fm.farm_id
      LEFT JOIN field f ON e.field_id = f.field_id
    `;
    let countSql = `SELECT COUNT(*) AS total FROM expense e`;
    const conditions = [];
    const params = [];
    const countParams = [];

    if (farm_id) {
      conditions.push('e.farm_id = ?');
      params.push(farm_id);
      countParams.push(farm_id);
    }
    if (category) {
      conditions.push('e.category = ?');
      params.push(category);
      countParams.push(category);
    }
    if (startDate) {
      conditions.push('e.expense_date >= ?');
      params.push(startDate);
      countParams.push(startDate);
    }
    if (endDate) {
      conditions.push('e.expense_date <= ?');
      params.push(endDate);
      countParams.push(endDate);
    }

    if (conditions.length > 0) {
      const where = ' WHERE ' + conditions.join(' AND ');
      sql += where;
      countSql += where;
    }

    sql += ' ORDER BY e.expense_date DESC, e.expense_id DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [expenses, countResult] = await Promise.all([
      query(sql, params),
      query(countSql, countParams),
    ]);

    const total = countResult[0]?.total || 0;
    return paginated(res, expenses, { page, limit, total }, 'Expenses retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/expenses (Record expense)
router.post('/', validate({ body: createExpenseSchema }), async (req, res, next) => {
  try {
    const { farm_id, field_id, expense_date, category, amount_usd, description } = req.body;

    const farmExists = await query('SELECT farm_id FROM farm WHERE farm_id = ?', [farm_id]);
    if (farmExists.length === 0) {
      throw new AppError(`Farm ID ${farm_id} does not exist`, 400, 'FARM_NOT_FOUND');
    }

    if (field_id) {
      const fieldExists = await query('SELECT field_id FROM field WHERE field_id = ?', [field_id]);
      if (fieldExists.length === 0) {
        throw new AppError(`Field ID ${field_id} does not exist`, 400, 'FIELD_NOT_FOUND');
      }
    }

    const result = await query(
      `INSERT INTO expense (farm_id, field_id, expense_date, category, amount_usd, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [farm_id, field_id || null, expense_date, category, amount_usd, description]
    );

    const newExpense = await query('SELECT * FROM expense WHERE expense_id = ?', [result.insertId]);
    return created(res, newExpense[0], 'Expense recorded successfully');
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/expenses/:id (Update expense)
router.put('/:id', validate({ params: idParamSchema, body: updateExpenseSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM expense WHERE expense_id = ?', [id]);
    if (existing.length === 0) {
      throw new AppError(`Expense record ID ${id} not found`, 404, 'EXPENSE_NOT_FOUND');
    }

    const updates = [];
    const params = [];
    const allowed = ['farm_id', 'field_id', 'expense_date', 'category', 'amount_usd', 'description'];

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
    await query(`UPDATE expense SET ${updates.join(', ')} WHERE expense_id = ?`, params);

    const updated = await query('SELECT * FROM expense WHERE expense_id = ?', [id]);
    return success(res, updated[0], 'Expense updated successfully');
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/expenses/:id (Delete expense)
router.delete('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT * FROM expense WHERE expense_id = ?', [id]);
    if (existing.length === 0) {
      throw new AppError(`Expense record ID ${id} not found`, 404, 'EXPENSE_NOT_FOUND');
    }

    await query('DELETE FROM expense WHERE expense_id = ?', [id]);
    return success(res, { deletedId: Number(id) }, 'Expense deleted successfully');
  } catch (error) {
    next(error);
  }
});

export default router;

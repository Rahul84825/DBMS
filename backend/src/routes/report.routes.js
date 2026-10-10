import { Router } from 'express';
import { query } from '../config/database.js';
import { success } from '../utils/response.js';

const router = Router();

// GET /api/v1/reports/harvests (Harvest yields & revenue aggregated by crop)
router.get('/harvests', async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        c.crop_id,
        c.crop_name,
        c.variety,
        COUNT(h.harvest_id) AS harvest_count,
        COALESCE(SUM(h.yield_quantity_kg), 0) AS total_yield_kg,
        COALESCE(SUM(h.market_value_usd), 0) AS total_revenue_usd,
        ROUND(COALESCE(SUM(h.yield_quantity_kg), 0) / NULLIF(SUM(p.planted_area_hectares), 0), 2) AS avg_yield_kg_per_ha
      FROM crop c
      LEFT JOIN planting p ON c.crop_id = p.crop_id
      LEFT JOIN harvest h ON p.planting_id = h.planting_id
      GROUP BY c.crop_id, c.crop_name, c.variety
      ORDER BY total_revenue_usd DESC, total_yield_kg DESC
    `;

    const report = await query(sql);
    return success(res, report, 'Harvest performance report generated successfully');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/reports/expenses (Expense totals per farm and by category)
router.get('/expenses', async (req, res, next) => {
  try {
    const [byFarm, byCategory] = await Promise.all([
      // Grouped by Farm
      query(`
        SELECT 
          fm.farm_id,
          fm.farm_name,
          fm.location,
          COUNT(e.expense_id) AS transaction_count,
          COALESCE(SUM(e.amount_usd), 0) AS total_spent_usd,
          ROUND(COALESCE(AVG(e.amount_usd), 0), 2) AS avg_transaction_usd
        FROM farm fm
        LEFT JOIN expense e ON fm.farm_id = e.farm_id
        GROUP BY fm.farm_id, fm.farm_name, fm.location
        ORDER BY total_spent_usd DESC
      `),
      // Grouped by Category
      query(`
        SELECT 
          category,
          COUNT(expense_id) AS transaction_count,
          COALESCE(SUM(amount_usd), 0) AS total_spent_usd,
          ROUND(COALESCE(AVG(amount_usd), 0), 2) AS avg_amount_usd
        FROM expense
        GROUP BY category
        ORDER BY total_spent_usd DESC
      `),
    ]);

    return success(res, { byFarm, byCategory }, 'Expense analysis report generated successfully');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/reports/crops (Crop agronomic requirements and active cultivation cycles)
router.get('/crops', async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        c.crop_id,
        c.crop_name,
        c.variety,
        c.optimal_soil_moisture_min,
        c.optimal_soil_moisture_max,
        c.optimal_temp_celsius_min,
        c.optimal_temp_celsius_max,
        c.growth_duration_days,
        COUNT(p.planting_id) AS total_plantings,
        COUNT(CASE WHEN p.status = 'GROWING' THEN 1 END) AS currently_growing,
        COALESCE(SUM(p.planted_area_hectares), 0) AS total_hectares_planted
      FROM crop c
      LEFT JOIN planting p ON c.crop_id = p.crop_id
      GROUP BY c.crop_id
      ORDER BY c.crop_name ASC
    `;

    const crops = await query(sql);
    return success(res, crops, 'Crop cultivation report generated successfully');
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/reports/irrigation (Irrigation summary by field and method)
router.get('/irrigation', async (req, res, next) => {
  try {
    const [byField, byMethod, byReason] = await Promise.all([
      // Grouped by Field
      query(`
        SELECT 
          f.field_id,
          f.field_name,
          fm.farm_name,
          COUNT(i.irrigation_id) AS event_count,
          COALESCE(SUM(i.water_volume_liters), 0) AS total_liters_applied
        FROM field f
        INNER JOIN farm fm ON f.farm_id = fm.farm_id
        LEFT JOIN irrigation i ON f.field_id = i.field_id
        GROUP BY f.field_id, f.field_name, fm.farm_name
        ORDER BY total_liters_applied DESC
      `),
      // Grouped by Method
      query(`
        SELECT 
          irrigation_method,
          COUNT(irrigation_id) AS event_count,
          COALESCE(SUM(water_volume_liters), 0) AS total_liters
        FROM irrigation
        GROUP BY irrigation_method
        ORDER BY total_liters DESC
      `),
      // Grouped by Trigger Reason
      query(`
        SELECT 
          trigger_reason,
          COUNT(irrigation_id) AS event_count,
          COALESCE(SUM(water_volume_liters), 0) AS total_liters
        FROM irrigation
        GROUP BY trigger_reason
        ORDER BY event_count DESC
      `),
    ]);

    return success(res, { byField, byMethod, byReason }, 'Irrigation operational report generated successfully');
  } catch (error) {
    next(error);
  }
});

export default router;

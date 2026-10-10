import { Router } from 'express';
import { query } from '../config/database.js';
import { success } from '../utils/response.js';

const router = Router();

// GET /api/v1/dashboard/summary (Consolidated dashboard metrics)
router.get('/summary', async (req, res, next) => {
  try {
    const threshold = req.query.threshold !== undefined 
      ? Number(req.query.threshold) 
      : (Number(process.env.DEFAULT_MOISTURE_ALERT_THRESHOLD) || 30.0);

    // Run independent aggregate queries to prevent cartesian products / double counting
    const [countsResult, harvestResult, expenseResult, alertResult, recentIrrigation, latestReadings] = await Promise.all([
      // Entity counts
      query(`
        SELECT 
          (SELECT COUNT(*) FROM farm) AS total_farms,
          (SELECT COUNT(*) FROM field) AS total_fields,
          (SELECT COUNT(*) FROM crop) AS total_crops,
          (SELECT COUNT(*) FROM planting WHERE status = 'GROWING') AS active_plantings,
          (SELECT COUNT(*) FROM planting) AS total_plantings,
          (SELECT COUNT(*) FROM sensor) AS total_sensors,
          (SELECT COUNT(*) FROM sensor WHERE status = 'ACTIVE') AS active_sensors,
          (SELECT COUNT(*) FROM sensor_reading) AS total_readings
      `),

      // Harvest aggregates
      query(`
        SELECT 
          COALESCE(SUM(yield_quantity_kg), 0) AS total_yield_kg,
          COALESCE(SUM(market_value_usd), 0) AS total_revenue_usd,
          COUNT(*) AS total_harvest_events
        FROM harvest
      `),

      // Expense aggregates
      query(`
        SELECT 
          COALESCE(SUM(amount_usd), 0) AS total_expense_usd,
          COUNT(*) AS total_expense_transactions
        FROM expense
      `),

      // Low moisture alerts
      query(`
        SELECT 
          s.sensor_id,
          s.sensor_code,
          f.field_name,
          fm.farm_name,
          sr.reading_value,
          sr.recorded_at
        FROM sensor_reading sr
        INNER JOIN sensor s ON sr.sensor_id = s.sensor_id
        INNER JOIN field f ON s.field_id = f.field_id
        INNER JOIN farm fm ON f.farm_id = fm.farm_id
        INNER JOIN (
          SELECT sensor_id, MAX(reading_id) AS max_reading_id
          FROM sensor_reading
          WHERE is_valid = TRUE
          GROUP BY sensor_id
        ) latest ON s.sensor_id = latest.sensor_id AND sr.reading_id = latest.max_reading_id
        WHERE s.sensor_type = 'SOIL_MOISTURE'
          AND sr.reading_value < ?
        ORDER BY sr.reading_value ASC
      `, [threshold]),

      // Recent irrigation activity
      query(`
        SELECT 
          i.irrigation_id,
          i.field_id,
          f.field_name,
          fm.farm_name,
          i.start_time,
          i.end_time,
          i.water_volume_liters,
          i.irrigation_method,
          i.trigger_reason
        FROM irrigation i
        INNER JOIN field f ON i.field_id = f.field_id
        INNER JOIN farm fm ON f.farm_id = fm.farm_id
        ORDER BY i.start_time DESC
        LIMIT 5
      `),

      // Sample latest readings across sensors
      query(`
        SELECT 
          s.sensor_id,
          s.sensor_code,
          s.sensor_type,
          s.unit_of_measurement,
          f.field_name,
          fm.farm_name,
          sr.reading_value,
          sr.recorded_at
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
      `),
    ]);

    const counts = countsResult[0] || {};
    const harvest = harvestResult[0] || {};
    const expense = expenseResult[0] || {};

    const netIncome = Number(harvest.total_revenue_usd || 0) - Number(expense.total_expense_usd || 0);

    const summaryData = {
      counts: {
        farms: Number(counts.total_farms || 0),
        fields: Number(counts.total_fields || 0),
        crops: Number(counts.total_crops || 0),
        activePlantings: Number(counts.active_plantings || 0),
        totalPlantings: Number(counts.total_plantings || 0),
        sensors: Number(counts.total_sensors || 0),
        activeSensors: Number(counts.active_sensors || 0),
        telemetryReadings: Number(counts.total_readings || 0),
      },
      financials: {
        totalYieldKg: Number(harvest.total_yield_kg || 0),
        totalRevenueUsd: Number(harvest.total_revenue_usd || 0),
        totalExpenseUsd: Number(expense.total_expense_usd || 0),
        netIncomeUsd: netIncome,
        currency: 'USD',
      },
      alerts: {
        count: alertResult.length,
        thresholdUsed: threshold,
        items: alertResult,
      },
      recentIrrigation,
      latestReadings,
    };

    return success(res, summaryData, 'Dashboard summary metrics calculated successfully');
  } catch (error) {
    next(error);
  }
});

export default router;

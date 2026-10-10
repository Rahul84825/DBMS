import { z } from 'zod';

// ==========================================
// 1. FARM VALIDATORS
// ==========================================
export const createFarmSchema = z.object({
  farm_name: z.string().trim().min(2, 'Farm name must be at least 2 characters').max(100),
  owner_name: z.string().trim().min(2, 'Owner name must be at least 2 characters').max(100),
  location: z.string().trim().min(2, 'Location must be at least 2 characters').max(150),
  total_area_hectares: z.coerce.number().positive('Total area in hectares must be greater than 0'),
});

export const updateFarmSchema = createFarmSchema.partial();

// ==========================================
// 2. FIELD VALIDATORS
// ==========================================
export const createFieldSchema = z.object({
  farm_id: z.coerce.number().int().positive('farm_id must be a positive integer'),
  field_name: z.string().trim().min(1, 'Field name is required').max(80),
  area_hectares: z.coerce.number().positive('Area in hectares must be greater than 0'),
  soil_type: z.string().trim().min(2, 'Soil type is required').max(50),
});

export const updateFieldSchema = createFieldSchema.partial();

// ==========================================
// 3. CROP VALIDATORS
// ==========================================
export const createCropSchema = z
  .object({
    crop_name: z.string().trim().min(2, 'Crop name is required').max(80),
    variety: z.string().trim().max(80).default('Standard'),
    optimal_soil_moisture_min: z.coerce.number().min(0).max(100, 'Moisture min must be between 0 and 100'),
    optimal_soil_moisture_max: z.coerce.number().min(0).max(100, 'Moisture max must be between 0 and 100'),
    optimal_temp_celsius_min: z.coerce.number(),
    optimal_temp_celsius_max: z.coerce.number(),
    growth_duration_days: z.coerce.number().int().positive('Growth duration days must be greater than 0'),
  })
  .refine((data) => data.optimal_soil_moisture_max >= data.optimal_soil_moisture_min, {
    message: 'optimal_soil_moisture_max must be greater than or equal to optimal_soil_moisture_min',
    path: ['optimal_soil_moisture_max'],
  })
  .refine((data) => data.optimal_temp_celsius_max >= data.optimal_temp_celsius_min, {
    message: 'optimal_temp_celsius_max must be greater than or equal to optimal_temp_celsius_min',
    path: ['optimal_temp_celsius_max'],
  });

export const updateCropSchema = z.object({
  crop_name: z.string().trim().min(2).max(80).optional(),
  variety: z.string().trim().max(80).optional(),
  optimal_soil_moisture_min: z.coerce.number().min(0).max(100).optional(),
  optimal_soil_moisture_max: z.coerce.number().min(0).max(100).optional(),
  optimal_temp_celsius_min: z.coerce.number().optional(),
  optimal_temp_celsius_max: z.coerce.number().optional(),
  growth_duration_days: z.coerce.number().int().positive().optional(),
});

// ==========================================
// 4. PLANTING VALIDATORS
// ==========================================
export const createPlantingSchema = z.object({
  field_id: z.coerce.number().int().positive('field_id must be a positive integer'),
  crop_id: z.coerce.number().int().positive('crop_id must be a positive integer'),
  planting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'planting_date must be YYYY-MM-DD'),
  expected_harvest_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected_harvest_date must be YYYY-MM-DD').optional().nullable(),
  status: z.enum(['PLANNED', 'GROWING', 'HARVESTED', 'FAILED']).default('GROWING'),
  planted_area_hectares: z.coerce.number().positive('Planted area must be greater than 0'),
  notes: z.string().trim().optional().nullable(),
});

export const updatePlantingSchema = createPlantingSchema.partial();

// ==========================================
// 5. SENSOR VALIDATORS
// ==========================================
export const createSensorSchema = z.object({
  field_id: z.coerce.number().int().positive('field_id must be a positive integer'),
  sensor_code: z.string().trim().min(2, 'Sensor code is required').max(50),
  sensor_type: z.enum(['SOIL_MOISTURE', 'AIR_TEMPERATURE', 'HUMIDITY', 'LIGHT']),
  unit_of_measurement: z.string().trim().min(1, 'Unit of measurement is required').max(20),
  status: z.enum(['ACTIVE', 'INACTIVE', 'FAULTY', 'MAINTENANCE']).default('ACTIVE'),
  installation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'installation_date must be YYYY-MM-DD'),
});

export const updateSensorSchema = createSensorSchema.partial();

// ==========================================
// 6. SENSOR READING VALIDATORS
// ==========================================
export const createReadingSchema = z.object({
  sensor_id: z.coerce.number().int().positive().optional(),
  sensor_code: z.string().trim().optional(),
  reading_value: z.coerce.number(),
  recorded_at: z.string().optional(), // ISO string or YYYY-MM-DD HH:MM:SS
  data_source: z.enum(['SIMULATED', 'REAL']).default('SIMULATED'),
  is_valid: z.coerce.boolean().default(true),
}).refine((data) => data.sensor_id !== undefined || data.sensor_code !== undefined, {
  message: 'Either sensor_id or sensor_code must be provided',
  path: ['sensor_id'],
});

export const queryReadingsSchema = z.object({
  sensor_id: z.coerce.number().int().positive().optional(),
  sensor_type: z.enum(['SOIL_MOISTURE', 'AIR_TEMPERATURE', 'HUMIDITY', 'LIGHT']).optional(),
  field_id: z.coerce.number().int().positive().optional(),
  data_source: z.enum(['SIMULATED', 'REAL']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional().default('1').transform((v) => Math.max(1, parseInt(v, 10) || 1)),
  limit: z.string().optional().default('50').transform((v) => Math.min(200, Math.max(1, parseInt(v, 10) || 50))),
});

export const alertThresholdSchema = z.object({
  threshold: z.coerce.number().min(0).max(100).default(30.0),
});

// ==========================================
// 7. IRRIGATION VALIDATORS
// ==========================================
export const createIrrigationSchema = z.object({
  field_id: z.coerce.number().int().positive('field_id must be a positive integer'),
  start_time: z.string().min(10, 'start_time is required'),
  end_time: z.string().optional().nullable(),
  water_volume_liters: z.coerce.number().min(0, 'Water volume cannot be negative'),
  irrigation_method: z.enum(['DRIP', 'SPRINKLER', 'FLOOD', 'MANUAL']).default('DRIP'),
  trigger_reason: z.enum(['MANUAL_SCHEDULE', 'LOW_MOISTURE_ALERT', 'AUTOMATED_RULE']).default('LOW_MOISTURE_ALERT'),
  notes: z.string().trim().max(255).optional().nullable(),
});

export const updateIrrigationSchema = createIrrigationSchema.partial();

// ==========================================
// 8. HARVEST VALIDATORS
// ==========================================
export const createHarvestSchema = z.object({
  planting_id: z.coerce.number().int().positive('planting_id must be a positive integer'),
  harvest_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'harvest_date must be YYYY-MM-DD'),
  yield_quantity_kg: z.coerce.number().min(0, 'Yield quantity cannot be negative'),
  quality_grade: z.enum(['A', 'B', 'C', 'REJECTED']).default('A'),
  market_value_usd: z.coerce.number().min(0, 'Market value cannot be negative').optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const updateHarvestSchema = createHarvestSchema.partial();

// ==========================================
// 9. EXPENSE VALIDATORS
// ==========================================
export const createExpenseSchema = z.object({
  farm_id: z.coerce.number().int().positive('farm_id must be a positive integer'),
  field_id: z.coerce.number().int().positive().optional().nullable(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expense_date must be YYYY-MM-DD'),
  category: z.enum(['SEEDS', 'FERTILIZER', 'IRRIGATION_WATER', 'LABOR', 'EQUIPMENT_MAINTENANCE', 'SENSOR_HARDWARE', 'OTHER']),
  amount_usd: z.coerce.number().positive('amount_usd must be greater than 0'),
  description: z.string().trim().min(2, 'Description is required').max(255),
});

export const updateExpenseSchema = createExpenseSchema.partial();

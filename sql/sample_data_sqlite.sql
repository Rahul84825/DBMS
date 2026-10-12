-- ============================================================================
-- SMART FARM DATABASE MANAGEMENT SYSTEM (SQLite)
-- File: sql/sample_data_sqlite.sql
-- Description: Illustrative Seed Data for Development and Demonstration
-- Safety: Uses INSERT OR IGNORE to ensure idempotent execution.
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- 1. SEED: FARMS (2 Demonstration Estates)
-- ----------------------------------------------------------------------------
INSERT OR IGNORE INTO farm (farm_id, farm_name, owner_name, location, total_area_hectares)
VALUES
    (1, 'Green Valley Agro Estate', 'Dr. Ramesh Patel', 'Nashik, Maharashtra, India', 45.50),
    (2, 'SunRidge Precision Acres', 'Sarah Jenkins', 'Fresno County, California, USA', 68.00);

-- ----------------------------------------------------------------------------
-- 2. SEED: CROPS (4 Agronomic Crop Profiles)
-- ----------------------------------------------------------------------------
INSERT OR IGNORE INTO crop (crop_id, crop_name, variety, optimal_soil_moisture_min, optimal_soil_moisture_max, optimal_temp_celsius_min, optimal_temp_celsius_max, growth_duration_days)
VALUES
    (1, 'Tomato', 'Roma', 60.00, 80.00, 18.00, 30.00, 85),
    (2, 'Wheat', 'Durum', 45.00, 65.00, 12.00, 26.00, 120),
    (3, 'Corn', 'Sweet Maize', 55.00, 75.00, 18.00, 32.00, 90),
    (4, 'Lettuce', 'Butterhead', 65.00, 85.00, 15.00, 24.00, 55);

-- ----------------------------------------------------------------------------
-- 3. SEED: FIELDS (4 Parcels Across the 2 Farms)
-- ----------------------------------------------------------------------------
INSERT OR IGNORE INTO field (field_id, farm_id, field_name, area_hectares, soil_type)
VALUES
    (1, 1, 'North Parcel Alpha', 15.00, 'Clay Loam'),
    (2, 1, 'Polyhouse Block 1', 5.50, 'Sandy Loam'),
    (3, 2, 'South Basin Plot', 25.00, 'Silt Loam'),
    (4, 2, 'West Ridge Terrace', 20.00, 'Loam');

-- ----------------------------------------------------------------------------
-- 4. SEED: PLANTING CYCLES (Cultivation Linking Fields to Crops)
-- ----------------------------------------------------------------------------
INSERT OR IGNORE INTO planting (planting_id, field_id, crop_id, planting_date, expected_harvest_date, status, planted_area_hectares, notes)
VALUES
    (1, 1, 1, '2026-08-01', '2026-10-25', 'GROWING', 12.00, 'Drip-line installed; organic mulch applied.'),
    (2, 2, 4, '2026-09-05', '2026-10-30', 'GROWING', 5.00, 'Controlled climate greenhouse trial.'),
    (3, 3, 2, '2026-05-10', '2026-09-10', 'HARVESTED', 24.00, 'Full summer wheat cycle completed.'),
    (4, 4, 3, '2026-06-15', '2026-09-20', 'HARVESTED', 18.00, 'Mechanized harvester utilized.');

-- ----------------------------------------------------------------------------
-- 5. SEED: SENSORS (6 IoT Devices Across Monitored Fields)
-- ----------------------------------------------------------------------------
INSERT OR IGNORE INTO sensor (sensor_id, field_id, sensor_code, sensor_type, unit_of_measurement, status, installation_date)
VALUES
    (1, 1, 'SNS-FLD1-SM01', 'SOIL_MOISTURE', '%', 'ACTIVE', '2026-08-02'),
    (2, 1, 'SNS-FLD1-TMP01', 'AIR_TEMPERATURE', '°C', 'ACTIVE', '2026-08-02'),
    (3, 2, 'SNS-FLD2-SM01', 'SOIL_MOISTURE', '%', 'ACTIVE', '2026-09-06'),
    (4, 2, 'SNS-FLD2-TMP01', 'AIR_TEMPERATURE', '°C', 'ACTIVE', '2026-09-06'),
    (5, 3, 'SNS-FLD3-SM01', 'SOIL_MOISTURE', '%', 'ACTIVE', '2026-05-12'),
    (6, 4, 'SNS-FLD4-SM01', 'SOIL_MOISTURE', '%', 'ACTIVE', '2026-06-16');

-- ----------------------------------------------------------------------------
-- 6. SEED: SENSOR READINGS (Simulated Time-Series Observations)
-- ----------------------------------------------------------------------------
INSERT OR IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
VALUES
    -- Field 1 Moisture readings (demonstrating normal, declining, and threshold breach)
    (1, 1, '2026-10-09 08:00:00', 68.50, 'SIMULATED', 1),
    (2, 1, '2026-10-09 14:00:00', 61.20, 'SIMULATED', 1),
    (3, 1, '2026-10-10 08:00:00', 52.40, 'SIMULATED', 1),
    (4, 1, '2026-10-10 14:00:00', 44.80, 'SIMULATED', 1),

    -- Field 1 Temperature readings
    (5, 2, '2026-10-09 08:00:00', 21.50, 'SIMULATED', 1),
    (6, 2, '2026-10-09 14:00:00', 29.80, 'SIMULATED', 1),
    (7, 2, '2026-10-10 08:00:00', 22.10, 'SIMULATED', 1),
    (8, 2, '2026-10-10 14:00:00', 31.00, 'SIMULATED', 1),

    -- Field 2 Greenhouse Moisture readings
    (9,  3, '2026-10-10 08:00:00', 74.00, 'SIMULATED', 1),
    (10, 3, '2026-10-10 14:00:00', 71.50, 'SIMULATED', 1),

    -- Field 2 Temperature readings
    (11, 4, '2026-10-10 08:00:00', 20.20, 'SIMULATED', 1),
    (12, 4, '2026-10-10 14:00:00', 23.50, 'SIMULATED', 1),

    -- Field 3 & 4 historical check readings
    (13, 5, '2026-09-08 12:00:00', 48.00, 'SIMULATED', 1),
    (14, 6, '2026-09-18 12:00:00', 58.20, 'SIMULATED', 1),

    -- Extended simulated readings from generated telemetry
    (101, 1, '2026-10-11 08:00:00', 67.79, 'SIMULATED', 1),
    (102, 2, '2026-10-11 08:00:00', 22.28, 'SIMULATED', 1),
    (103, 3, '2026-10-11 08:00:00', 69.68, 'SIMULATED', 1),
    (104, 4, '2026-10-11 08:00:00', 20.79, 'SIMULATED', 1),
    (105, 5, '2026-10-11 08:00:00', 57.52, 'SIMULATED', 1),
    (106, 6, '2026-10-11 08:00:00', 63.53, 'SIMULATED', 1),
    (107, 1, '2026-10-11 10:00:00', 72.84, 'SIMULATED', 1),
    (108, 2, '2026-10-11 10:00:00', 22.96, 'SIMULATED', 1),
    (109, 3, '2026-10-11 10:00:00', 72.17, 'SIMULATED', 1),
    (110, 4, '2026-10-11 10:00:00', 19.24, 'SIMULATED', 1),
    (111, 5, '2026-10-11 10:00:00', 48.72, 'SIMULATED', 1),
    (112, 6, '2026-10-11 10:00:00', 60.11, 'SIMULATED', 1),
    (113, 1, '2026-10-11 12:00:00', 24.50, 'SIMULATED', 1), -- Low moisture alert breach (<30%)
    (114, 2, '2026-10-11 12:00:00', 22.29, 'SIMULATED', 1),
    (115, 3, '2026-10-11 12:00:00', 68.38, 'SIMULATED', 1),
    (116, 4, '2026-10-11 12:00:00', 24.20, 'SIMULATED', 1),
    (117, 5, '2026-10-11 12:00:00', 54.26, 'SIMULATED', 1),
    (118, 6, '2026-10-11 12:00:00', 54.41, 'SIMULATED', 1),

    -- Additional observations for recent timeline
    (119, 1, '2026-10-12 06:00:00', 26.30, 'SIMULATED', 1),
    (120, 2, '2026-10-12 06:00:00', 19.80, 'SIMULATED', 1),
    (121, 3, '2026-10-12 06:00:00', 70.10, 'SIMULATED', 1),
    (122, 4, '2026-10-12 06:00:00', 18.50, 'SIMULATED', 1),
    (123, 5, '2026-10-12 06:00:00', 51.20, 'SIMULATED', 1),
    (124, 6, '2026-10-12 06:00:00', 56.40, 'SIMULATED', 1),
    (125, 1, '2026-10-12 09:30:00', 28.10, 'SIMULATED', 1), -- Persistent soil moisture alert
    (126, 2, '2026-10-12 09:30:00', 26.40, 'SIMULATED', 1),
    (127, 3, '2026-10-12 09:30:00', 68.90, 'SIMULATED', 1),
    (128, 4, '2026-10-12 09:30:00', 22.70, 'SIMULATED', 1);

-- ----------------------------------------------------------------------------
-- 7. SEED: IRRIGATION (Water Application Events)
-- ----------------------------------------------------------------------------
INSERT OR IGNORE INTO irrigation (irrigation_id, field_id, start_time, end_time, water_volume_liters, irrigation_method, trigger_reason, notes)
VALUES
    (1, 1, '2026-10-08 06:00:00', '2026-10-08 08:00:00', 12500.00, 'DRIP', 'MANUAL_SCHEDULE', 'Morning routine drip irrigation.'),
    (2, 1, '2026-10-10 15:00:00', '2026-10-10 17:30:00', 15000.00, 'DRIP', 'LOW_MOISTURE_ALERT', 'Automated response to soil moisture falling below 50%.'),
    (3, 2, '2026-10-09 07:00:00', '2026-10-09 07:45:00', 3200.00, 'SPRINKLER', 'AUTOMATED_RULE', 'Greenhouse misting cycle.'),
    (4, 3, '2026-08-15 05:00:00', '2026-08-15 09:00:00', 28000.00, 'FLOOD', 'MANUAL_SCHEDULE', 'Mid-season irrigation for wheat parcel.');

-- ----------------------------------------------------------------------------
-- 8. SEED: HARVESTS (Yield Realizations)
-- ----------------------------------------------------------------------------
INSERT OR IGNORE INTO harvest (harvest_id, planting_id, harvest_date, yield_quantity_kg, quality_grade, market_value_usd, notes)
VALUES
    (1, 3, '2026-09-10', 43200.00, 'A', 15120.00, 'Excellent wheat yield; premium protein test.'),
    (2, 4, '2026-09-20', 31500.00, 'B', 9450.00, 'Corn harvest completed before rainfall.'),
    (3, 1, '2026-10-05', 1800.00, 'A', 2700.00, 'Early selective pick of ripe Roma tomatoes.');

-- ----------------------------------------------------------------------------
-- 9. SEED: EXPENSES (Operational Ledger)
-- ----------------------------------------------------------------------------
INSERT OR IGNORE INTO expense (expense_id, farm_id, field_id, expense_date, category, amount_usd, description)
VALUES
    (1, 1, 1, '2026-07-28', 'SEEDS', 850.00, 'Certified Roma tomato seeds (lot #TR-2026).'),
    (2, 1, 1, '2026-08-10', 'FERTILIZER', 620.00, 'Water-soluble organic NPK fertilizer pack.'),
    (3, 1, 1, '2026-08-01', 'SENSOR_HARDWARE', 480.00, 'LoRaWAN Soil moisture and temperature sensor kit.'),
    (4, 1, NULL, '2026-09-30', 'LABOR', 1450.00, 'Monthly farm maintenance and field labor wages.'),
    (5, 2, 3, '2026-05-05', 'SEEDS', 1200.00, 'Durum wheat seed stock for 25 hectares.'),
    (6, 2, 3, '2026-08-15', 'IRRIGATION_WATER', 740.00, 'Canal irrigation district municipal water levy.'),
    (7, 2, NULL, '2026-09-22', 'EQUIPMENT_MAINTENANCE', 1350.00, 'Harvester diesel servicing and blade sharpening.');

-- ============================================================================
-- SMART FARM DATABASE MANAGEMENT SYSTEM (MySQL 8.x)
-- File: Generated Simulated Sensor Telemetry
-- Generated At: 2026-10-10 20:43:22
-- Data Source: SIMULATED (Zero hardware dependency)
-- Safety: INSERT IGNORE with deterministic IDs prevents duplicate rows.
-- ============================================================================

USE smart_farm_db;

-- ----------------------------------------------------------------------------
-- 1. INSERT SIMULATED READINGS
-- Uses a subquery to look up sensor_id dynamically by sensor_code.
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 101, s.sensor_id, '2026-10-11 08:00:00', 67.79, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD1-SM01';
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 102, s.sensor_id, '2026-10-11 08:00:00', 22.28, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD1-TMP01';
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 103, s.sensor_id, '2026-10-11 08:00:00', 69.68, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD2-SM01';
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 104, s.sensor_id, '2026-10-11 08:00:00', 20.79, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD2-TMP01';
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 105, s.sensor_id, '2026-10-11 08:00:00', 57.52, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD3-SM01';
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 106, s.sensor_id, '2026-10-11 08:00:00', 63.53, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD4-SM01';
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 107, s.sensor_id, '2026-10-11 10:00:00', 72.84, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD1-SM01';
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 108, s.sensor_id, '2026-10-11 10:00:00', 22.96, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD1-TMP01';
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 109, s.sensor_id, '2026-10-11 10:00:00', 72.17, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD2-SM01';
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 110, s.sensor_id, '2026-10-11 10:00:00', 19.24, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD2-TMP01';
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 111, s.sensor_id, '2026-10-11 10:00:00', 48.72, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD3-SM01';
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 112, s.sensor_id, '2026-10-11 10:00:00', 60.11, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD4-SM01';
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 113, s.sensor_id, '2026-10-11 12:00:00', 24.50, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD1-SM01';
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 114, s.sensor_id, '2026-10-11 12:00:00', 22.29, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD1-TMP01';
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 115, s.sensor_id, '2026-10-11 12:00:00', 68.38, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD2-SM01';
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 116, s.sensor_id, '2026-10-11 12:00:00', 24.20, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD2-TMP01';
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 117, s.sensor_id, '2026-10-11 12:00:00', 54.26, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD3-SM01';
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
SELECT 118, s.sensor_id, '2026-10-11 12:00:00', 54.41, 'SIMULATED', TRUE
FROM sensor s WHERE s.sensor_code = 'SNS-FLD4-SM01';

-- ----------------------------------------------------------------------------
-- 2. DEMONSTRATION IRRIGATION ALERT QUERY
-- Purpose: Identify active fields with latest moisture below demo threshold.
-- Demonstrative Threshold: 30.00% (Illustrative only, not a universal rule).
-- ----------------------------------------------------------------------------
SET @demo_irrigation_threshold := 30.00;

SELECT 
    fm.farm_name,
    f.field_name,
    s.sensor_code,
    sr.reading_value AS latest_soil_moisture_pct,
    @demo_irrigation_threshold AS alert_threshold_pct,
    sr.recorded_at AS timestamp_recorded,
    'ALERT: SOIL MOISTURE DEFICIT' AS advisory_notice,
    'RECOMMENDATION: REVIEW IRRIGATION SCHEDULE' AS system_advice
FROM sensor_reading sr
INNER JOIN sensor s ON sr.sensor_id = s.sensor_id
INNER JOIN field f ON s.field_id = f.field_id
INNER JOIN farm fm ON f.farm_id = fm.farm_id
INNER JOIN (
    -- Isolate the latest reading for each soil moisture sensor
    SELECT sensor_id, MAX(reading_id) AS max_reading_id
    FROM sensor_reading
    WHERE is_valid = TRUE
    GROUP BY sensor_id
) latest ON s.sensor_id = latest.sensor_id AND sr.reading_id = latest.max_reading_id
WHERE s.sensor_type = 'SOIL_MOISTURE'
  AND sr.reading_value < @demo_irrigation_threshold
ORDER BY sr.reading_value ASC;

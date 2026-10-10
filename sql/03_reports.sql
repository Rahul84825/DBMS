-- ============================================================================
-- SMART FARM DATABASE MANAGEMENT SYSTEM (MySQL 8.x)
-- File: sql/03_reports.sql
-- Description: Core Analytical Queries, Aggregations, Views, and Integrity Checks
-- Safety: Read-only reporting and non-destructive, safe demonstration queries.
-- All queries reference columns defined in sql/01_schema.sql.
-- ============================================================================

USE smart_farm_db;

-- ============================================================================
-- DEMONSTRATION 1: INSERT NEW RECORD
-- Plain Language: Inserts a new simulated temperature reading for Sensor #2.
-- Uses INSERT IGNORE with explicit reading_id = 15 to make it safe to rerun.
-- ============================================================================
INSERT IGNORE INTO sensor_reading (reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)
VALUES (15, 2, '2026-10-10 16:00:00', 32.40, 'SIMULATED', TRUE);

-- ============================================================================
-- DEMONSTRATION 2: SELECT AND WHERE FILTERING
-- Plain Language: Filters and retrieves all currently ACTIVE sensors installed
-- in fields with loam or clay-based soils, ordered by installation date.
-- ============================================================================
SELECT 
    s.sensor_code,
    s.sensor_type,
    s.unit_of_measurement,
    s.status AS sensor_status,
    f.field_name,
    f.soil_type,
    s.installation_date
FROM sensor s
INNER JOIN field f ON s.field_id = f.field_id
WHERE s.status = 'ACTIVE' 
  AND (f.soil_type LIKE '%Loam%' OR f.soil_type LIKE '%Clay%')
ORDER BY s.installation_date DESC;

-- ============================================================================
-- DEMONSTRATION 3: SAFE UPDATE ON AN EXISTING RECORD
-- Plain Language: Safely updates the notes of a specific planting cycle
-- (Planting #1) using its exact Primary Key, ensuring idempotency.
-- ============================================================================
UPDATE planting
SET notes = 'Drip-line installed; organic mulch applied. [Inspection Note: First harvest commenced early October.]'
WHERE planting_id = 1;

-- ============================================================================
-- DEMONSTRATION 4: MULTI-TABLE JOIN (Farm -> Field -> Planting -> Crop)
-- Plain Language: Produces an operational overview showing which farm owns each field,
-- what crop variety is currently planted, and the expected harvest timeline.
-- ============================================================================
SELECT 
    fm.farm_name,
    fm.owner_name,
    fd.field_name,
    fd.area_hectares AS field_size_ha,
    c.crop_name,
    c.variety AS crop_variety,
    p.planting_date,
    p.expected_harvest_date,
    p.status AS planting_status,
    p.planted_area_hectares
FROM farm fm
INNER JOIN field fd ON fm.farm_id = fd.farm_id
INNER JOIN planting p ON fd.field_id = p.field_id
INNER JOIN crop c ON p.crop_id = c.crop_id
ORDER BY fm.farm_name, fd.field_name;

-- ============================================================================
-- DEMONSTRATION 5: GROUP BY & AGGREGATE FUNCTIONS (Harvest Totals)
-- Plain Language: Aggregates total kilograms harvested, total revenue in USD,
-- and average yield per hectare, grouped by crop species and variety.
-- ============================================================================
SELECT 
    c.crop_name,
    c.variety,
    COUNT(h.harvest_id) AS harvest_count,
    SUM(h.yield_quantity_kg) AS total_yield_kg,
    SUM(h.market_value_usd) AS total_revenue_usd,
    ROUND(SUM(h.yield_quantity_kg) / SUM(p.planted_area_hectares), 2) AS avg_yield_kg_per_ha
FROM crop c
INNER JOIN planting p ON c.crop_id = p.crop_id
INNER JOIN harvest h ON p.planting_id = h.planting_id
GROUP BY c.crop_id, c.crop_name, c.variety
ORDER BY total_revenue_usd DESC;

-- ============================================================================
-- DEMONSTRATION 6: EXPENSE TOTALS PER FARM
-- Plain Language: Calculates the total money spent per farm, broken down by
-- number of expense items, total USD amount, and average expense amount.
-- ============================================================================
SELECT 
    fm.farm_id,
    fm.farm_name,
    fm.location,
    COUNT(e.expense_id) AS total_transactions,
    SUM(e.amount_usd) AS total_spent_usd,
    ROUND(AVG(e.amount_usd), 2) AS avg_transaction_usd
FROM farm fm
LEFT JOIN expense e ON fm.farm_id = e.farm_id
GROUP BY fm.farm_id, fm.farm_name, fm.location
ORDER BY total_spent_usd DESC;

-- ============================================================================
-- DEMONSTRATION 7: LATEST SENSOR READING PER SENSOR (Window Function)
-- Plain Language: Finds the single most recent reading for each sensor device,
-- including the sensor's code, field location, timestamp, and measurement value.
-- ============================================================================
WITH RankedReadings AS (
    SELECT 
        sr.reading_id,
        sr.sensor_id,
        sr.recorded_at,
        sr.reading_value,
        sr.data_source,
        ROW_NUMBER() OVER (
            PARTITION BY sr.sensor_id 
            ORDER BY sr.recorded_at DESC, sr.reading_id DESC
        ) AS rn
    FROM sensor_reading sr
    WHERE sr.is_valid = TRUE
)
SELECT 
    s.sensor_code,
    s.sensor_type,
    s.unit_of_measurement,
    f.field_name,
    rr.recorded_at AS latest_timestamp,
    rr.reading_value AS latest_value,
    rr.data_source
FROM RankedReadings rr
INNER JOIN sensor s ON rr.sensor_id = s.sensor_id
INNER JOIN field f ON s.field_id = f.field_id
WHERE rr.rn = 1
ORDER BY s.sensor_code;

-- ============================================================================
-- DEMONSTRATION 8: LOW SOIL MOISTURE ALERT REPORT
-- Plain Language: Compares current soil moisture readings against a configurable
-- demonstration threshold (@demo_moisture_threshold) to identify parcels requiring
-- immediate irrigation intervention.
-- ============================================================================
SET @demo_moisture_threshold := 50.00;

SELECT 
    fm.farm_name,
    f.field_name,
    s.sensor_code,
    sr.reading_value AS current_moisture_pct,
    @demo_moisture_threshold AS alert_threshold_pct,
    sr.recorded_at AS measurement_time,
    'IRRIGATION REQUIRED' AS alert_status
FROM sensor_reading sr
INNER JOIN sensor s ON sr.sensor_id = s.sensor_id
INNER JOIN field f ON s.field_id = f.field_id
INNER JOIN farm fm ON f.farm_id = fm.farm_id
INNER JOIN (
    -- Subquery ensuring we evaluate ONLY the most recent reading per sensor
    SELECT sensor_id, MAX(reading_id) AS max_reading_id
    FROM sensor_reading
    WHERE is_valid = TRUE
    GROUP BY sensor_id
) latest ON s.sensor_id = latest.sensor_id AND sr.reading_id = latest.max_reading_id
WHERE s.sensor_type = 'SOIL_MOISTURE'
  AND sr.reading_value < @demo_moisture_threshold
ORDER BY sr.reading_value ASC;

-- ============================================================================
-- DEMONSTRATION 9: VIEW FOR DISPLAYING LATEST SENSOR READINGS
-- Plain Language: Creates a reusable virtual table (View) that application
-- developers or operators can query to immediately see the newest reading
-- for every sensor across all farms without having to write subqueries.
-- ============================================================================
CREATE OR REPLACE VIEW v_latest_sensor_readings AS
SELECT 
    s.sensor_id,
    s.sensor_code,
    s.sensor_type,
    s.unit_of_measurement,
    f.field_id,
    f.field_name,
    fm.farm_id,
    fm.farm_name,
    sr.reading_id,
    sr.reading_value,
    sr.recorded_at,
    sr.data_source
FROM sensor s
INNER JOIN field f ON s.field_id = f.field_id
INNER JOIN farm fm ON f.farm_id = fm.farm_id
INNER JOIN (
    -- Subquery finding the highest reading_id per sensor
    SELECT sensor_id, MAX(reading_id) AS max_reading_id
    FROM sensor_reading
    WHERE is_valid = TRUE
    GROUP BY sensor_id
) latest ON s.sensor_id = latest.sensor_id
INNER JOIN sensor_reading sr ON latest.max_reading_id = sr.reading_id;

-- Verify querying the view:
SELECT 
    farm_name, 
    field_name, 
    sensor_code, 
    sensor_type, 
    reading_value, 
    unit_of_measurement, 
    recorded_at, 
    data_source 
FROM v_latest_sensor_readings
ORDER BY sensor_code;

-- ============================================================================
-- DEMONSTRATION 10: FOREIGN-KEY INTEGRITY VERIFICATION TEST
-- Plain Language: Demonstrates that MySQL InnoDB strictly blocks orphaned
-- records by rejecting child rows that reference a non-existent parent key.
-- Attempting to insert a field pointing to non-existent farm_id 99999 triggers Error 1452.
--
-- To run this test interactively in MySQL Workbench, execute the line below:
--
-- INSERT INTO field (farm_id, field_name, area_hectares, soil_type)
-- VALUES (99999, 'Orphaned Field Test', 10.00, 'Loam');
--
-- Expected Output:
-- Error Code: 1452. Cannot add or update a child row: a foreign key constraint fails 
-- (`smart_farm_db`.`field`, CONSTRAINT `fk_field_farm` FOREIGN KEY (`farm_id`) REFERENCES `farm` (`farm_id`))
-- ============================================================================

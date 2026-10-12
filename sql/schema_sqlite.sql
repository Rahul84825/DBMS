-- ============================================================================
-- SMART FARM DATABASE MANAGEMENT SYSTEM (SQLite)
-- File: sql/schema_sqlite.sql
-- Description: Core Relational DDL Schema adapted for SQLite
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. FARM TABLE
CREATE TABLE IF NOT EXISTS farm (
    farm_id              INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_name            TEXT NOT NULL UNIQUE,
    owner_name           TEXT NOT NULL,
    location             TEXT NOT NULL,
    total_area_hectares  REAL NOT NULL,
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_farm_total_area CHECK (total_area_hectares > 0)
);

-- 2. CROP TABLE
CREATE TABLE IF NOT EXISTS crop (
    crop_id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    crop_name                  TEXT NOT NULL,
    variety                    TEXT DEFAULT 'Standard',
    optimal_soil_moisture_min  REAL NOT NULL,
    optimal_soil_moisture_max  REAL NOT NULL,
    optimal_temp_celsius_min   REAL NOT NULL,
    optimal_temp_celsius_max   REAL NOT NULL,
    growth_duration_days       INTEGER NOT NULL,
    CONSTRAINT uq_crop_name_variety UNIQUE (crop_name, variety),
    CONSTRAINT chk_crop_growth_days CHECK (growth_duration_days > 0),
    CONSTRAINT chk_crop_moisture_range CHECK (
        optimal_soil_moisture_min >= 0 AND 
        optimal_soil_moisture_max <= 100 AND 
        optimal_soil_moisture_max >= optimal_soil_moisture_min
    ),
    CONSTRAINT chk_crop_temp_range CHECK (
        optimal_temp_celsius_max >= optimal_temp_celsius_min
    )
);

-- 3. FIELD TABLE
CREATE TABLE IF NOT EXISTS field (
    field_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id         INTEGER NOT NULL,
    field_name      TEXT NOT NULL,
    area_hectares   REAL NOT NULL,
    soil_type       TEXT NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_farm_field_name UNIQUE (farm_id, field_name),
    CONSTRAINT chk_field_area CHECK (area_hectares > 0),
    CONSTRAINT fk_field_farm FOREIGN KEY (farm_id)
        REFERENCES farm (farm_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_field_farm ON field (farm_id);

-- 4. PLANTING TABLE
CREATE TABLE IF NOT EXISTS planting (
    planting_id            INTEGER PRIMARY KEY AUTOINCREMENT,
    field_id               INTEGER NOT NULL,
    crop_id                INTEGER NOT NULL,
    planting_date          TEXT NOT NULL,
    expected_harvest_date  TEXT NULL,
    status                 TEXT NOT NULL DEFAULT 'GROWING' CHECK (status IN ('PLANNED', 'GROWING', 'HARVESTED', 'FAILED')),
    planted_area_hectares  REAL NOT NULL,
    notes                  TEXT NULL,
    CONSTRAINT chk_planted_area CHECK (planted_area_hectares > 0),
    CONSTRAINT chk_planting_dates CHECK (
        expected_harvest_date IS NULL OR expected_harvest_date >= planting_date
    ),
    CONSTRAINT fk_planting_field FOREIGN KEY (field_id)
        REFERENCES field (field_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_planting_crop FOREIGN KEY (crop_id)
        REFERENCES crop (crop_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_planting_field ON planting (field_id);
CREATE INDEX IF NOT EXISTS idx_planting_crop ON planting (crop_id);
CREATE INDEX IF NOT EXISTS idx_planting_status ON planting (status);

-- 5. SENSOR TABLE
CREATE TABLE IF NOT EXISTS sensor (
    sensor_id            INTEGER PRIMARY KEY AUTOINCREMENT,
    field_id             INTEGER NOT NULL,
    sensor_code          TEXT NOT NULL UNIQUE,
    sensor_type          TEXT NOT NULL CHECK (sensor_type IN ('SOIL_MOISTURE', 'AIR_TEMPERATURE', 'HUMIDITY', 'LIGHT')),
    unit_of_measurement  TEXT NOT NULL,
    status               TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'FAULTY', 'MAINTENANCE')),
    installation_date    TEXT NOT NULL,
    CONSTRAINT fk_sensor_field FOREIGN KEY (field_id)
        REFERENCES field (field_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sensor_field ON sensor (field_id);
CREATE INDEX IF NOT EXISTS idx_sensor_type ON sensor (sensor_type);

-- 6. SENSOR_READING TABLE
CREATE TABLE IF NOT EXISTS sensor_reading (
    reading_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_id      INTEGER NOT NULL,
    recorded_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reading_value  REAL NOT NULL,
    data_source    TEXT NOT NULL DEFAULT 'SIMULATED' CHECK (data_source IN ('SIMULATED', 'REAL')),
    is_valid       INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT fk_reading_sensor FOREIGN KEY (sensor_id)
        REFERENCES sensor (sensor_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reading_sensor_time ON sensor_reading (sensor_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_recorded_at ON sensor_reading (recorded_at);
CREATE INDEX IF NOT EXISTS idx_reading_data_source ON sensor_reading (data_source);

-- 7. IRRIGATION TABLE
CREATE TABLE IF NOT EXISTS irrigation (
    irrigation_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    field_id             INTEGER NOT NULL,
    start_time           DATETIME NOT NULL,
    end_time             DATETIME NULL,
    water_volume_liters  REAL NOT NULL,
    irrigation_method    TEXT NOT NULL DEFAULT 'DRIP' CHECK (irrigation_method IN ('DRIP', 'SPRINKLER', 'FLOOD', 'MANUAL')),
    trigger_reason       TEXT NOT NULL DEFAULT 'LOW_MOISTURE_ALERT' CHECK (trigger_reason IN ('MANUAL_SCHEDULE', 'LOW_MOISTURE_ALERT', 'AUTOMATED_RULE')),
    notes                TEXT NULL,
    CONSTRAINT chk_irrigation_water CHECK (water_volume_liters >= 0),
    CONSTRAINT chk_irrigation_times CHECK (end_time IS NULL OR end_time >= start_time),
    CONSTRAINT fk_irrigation_field FOREIGN KEY (field_id)
        REFERENCES field (field_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_irrigation_field ON irrigation (field_id);
CREATE INDEX IF NOT EXISTS idx_irrigation_start_time ON irrigation (start_time);

-- 8. HARVEST TABLE
CREATE TABLE IF NOT EXISTS harvest (
    harvest_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    planting_id        INTEGER NOT NULL,
    harvest_date       TEXT NOT NULL,
    yield_quantity_kg  REAL NOT NULL,
    quality_grade      TEXT NOT NULL DEFAULT 'A' CHECK (quality_grade IN ('A', 'B', 'C', 'REJECTED')),
    market_value_usd   REAL NULL,
    notes              TEXT NULL,
    CONSTRAINT chk_harvest_yield CHECK (yield_quantity_kg >= 0),
    CONSTRAINT chk_harvest_value CHECK (market_value_usd IS NULL OR market_value_usd >= 0),
    CONSTRAINT fk_harvest_planting FOREIGN KEY (planting_id)
        REFERENCES planting (planting_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_harvest_planting ON harvest (planting_id);
CREATE INDEX IF NOT EXISTS idx_harvest_date ON harvest (harvest_date);

-- 9. EXPENSE TABLE
CREATE TABLE IF NOT EXISTS expense (
    expense_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    farm_id       INTEGER NOT NULL,
    field_id      INTEGER NULL,
    expense_date  TEXT NOT NULL,
    category      TEXT NOT NULL CHECK (category IN ('SEEDS', 'FERTILIZER', 'IRRIGATION_WATER', 'LABOR', 'EQUIPMENT_MAINTENANCE', 'SENSOR_HARDWARE', 'OTHER')),
    amount_usd    REAL NOT NULL,
    description   TEXT NOT NULL,
    CONSTRAINT chk_expense_amount CHECK (amount_usd > 0),
    CONSTRAINT fk_expense_farm FOREIGN KEY (farm_id)
        REFERENCES farm (farm_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_expense_field FOREIGN KEY (field_id)
        REFERENCES field (field_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_expense_farm ON expense (farm_id);
CREATE INDEX IF NOT EXISTS idx_expense_field ON expense (field_id);
CREATE INDEX IF NOT EXISTS idx_expense_date ON expense (expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_category ON expense (category);

-- ============================================================================
-- SMART FARM DATABASE MANAGEMENT SYSTEM (MySQL 8.x)
-- File: sql/01_schema.sql
-- Description: Core Relational DDL Schema
-- Compatible with: MySQL 8.0 / 8.4 LTS
-- ============================================================================

-- Step 1: Create Database safely without DROP
CREATE DATABASE IF NOT EXISTS smart_farm_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE smart_farm_db;

-- ============================================================================
-- 1. FARM TABLE
-- Purpose: Stores top-level agricultural estate and ownership information.
-- ============================================================================
CREATE TABLE IF NOT EXISTS farm (
    farm_id              INT AUTO_INCREMENT PRIMARY KEY,
    farm_name            VARCHAR(100) NOT NULL UNIQUE,
    owner_name           VARCHAR(100) NOT NULL,
    location             VARCHAR(150) NOT NULL,
    total_area_hectares  DECIMAL(8, 2) NOT NULL,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_farm_total_area CHECK (total_area_hectares > 0)
) ENGINE=InnoDB;

-- ============================================================================
-- 2. CROP TABLE
-- Purpose: Catalog of cultivated crop types, varieties, and optimal agronomic ranges.
-- ============================================================================
CREATE TABLE IF NOT EXISTS crop (
    crop_id                    INT AUTO_INCREMENT PRIMARY KEY,
    crop_name                  VARCHAR(80) NOT NULL,
    variety                    VARCHAR(80) DEFAULT 'Standard',
    optimal_soil_moisture_min  DECIMAL(5, 2) NOT NULL,
    optimal_soil_moisture_max  DECIMAL(5, 2) NOT NULL,
    optimal_temp_celsius_min   DECIMAL(5, 2) NOT NULL,
    optimal_temp_celsius_max   DECIMAL(5, 2) NOT NULL,
    growth_duration_days       INT NOT NULL,
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
) ENGINE=InnoDB;

-- ============================================================================
-- 3. FIELD TABLE
-- Purpose: Specific parcel or agricultural plot belonging to a farm.
-- Dependency: References farm(farm_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS field (
    field_id        INT AUTO_INCREMENT PRIMARY KEY,
    farm_id         INT NOT NULL,
    field_name      VARCHAR(80) NOT NULL,
    area_hectares   DECIMAL(8, 2) NOT NULL,
    soil_type       VARCHAR(50) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_farm_field_name UNIQUE (farm_id, field_name),
    CONSTRAINT chk_field_area CHECK (area_hectares > 0),
    CONSTRAINT fk_field_farm FOREIGN KEY (farm_id)
        REFERENCES farm (farm_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_field_farm ON field (farm_id);

-- ============================================================================
-- 4. PLANTING TABLE
-- Purpose: Resolves M:N relationship between field and crop across growth cycles.
-- Dependencies: References field(field_id), crop(crop_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS planting (
    planting_id            INT AUTO_INCREMENT PRIMARY KEY,
    field_id               INT NOT NULL,
    crop_id                INT NOT NULL,
    planting_date          DATE NOT NULL,
    expected_harvest_date  DATE NULL,
    status                 ENUM('PLANNED', 'GROWING', 'HARVESTED', 'FAILED') NOT NULL DEFAULT 'GROWING',
    planted_area_hectares  DECIMAL(8, 2) NOT NULL,
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
) ENGINE=InnoDB;

CREATE INDEX idx_planting_field ON planting (field_id);
CREATE INDEX idx_planting_crop ON planting (crop_id);
CREATE INDEX idx_planting_status ON planting (status);

-- ============================================================================
-- 5. SENSOR TABLE
-- Purpose: Physical/hardware identity and metadata of deployed IoT devices.
-- Dependency: References field(field_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sensor (
    sensor_id            INT AUTO_INCREMENT PRIMARY KEY,
    field_id             INT NOT NULL,
    sensor_code          VARCHAR(50) NOT NULL UNIQUE,
    sensor_type          ENUM('SOIL_MOISTURE', 'AIR_TEMPERATURE', 'HUMIDITY', 'LIGHT') NOT NULL,
    unit_of_measurement  VARCHAR(20) NOT NULL,
    status               ENUM('ACTIVE', 'INACTIVE', 'FAULTY', 'MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
    installation_date    DATE NOT NULL,
    CONSTRAINT fk_sensor_field FOREIGN KEY (field_id)
        REFERENCES field (field_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_sensor_field ON sensor (field_id);
CREATE INDEX idx_sensor_type ON sensor (sensor_type);

-- ============================================================================
-- 6. SENSOR_READING TABLE
-- Purpose: High-volume time-series telemetry records recorded by sensors.
-- Dependency: References sensor(sensor_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sensor_reading (
    reading_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    sensor_id      INT NOT NULL,
    recorded_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reading_value  DECIMAL(8, 2) NOT NULL,
    data_source    ENUM('SIMULATED', 'REAL') NOT NULL DEFAULT 'SIMULATED',
    is_valid       BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_reading_sensor FOREIGN KEY (sensor_id)
        REFERENCES sensor (sensor_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Composite index optimized for "latest reading per sensor" and time-range queries
CREATE INDEX idx_reading_sensor_time ON sensor_reading (sensor_id, recorded_at DESC);
CREATE INDEX idx_reading_recorded_at ON sensor_reading (recorded_at);
CREATE INDEX idx_reading_data_source ON sensor_reading (data_source);

-- ============================================================================
-- 7. IRRIGATION TABLE
-- Purpose: Logs automated or manual watering events per field.
-- Dependency: References field(field_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS irrigation (
    irrigation_id        INT AUTO_INCREMENT PRIMARY KEY,
    field_id             INT NOT NULL,
    start_time           DATETIME NOT NULL,
    end_time             DATETIME NULL,
    water_volume_liters  DECIMAL(10, 2) NOT NULL,
    irrigation_method    ENUM('DRIP', 'SPRINKLER', 'FLOOD', 'MANUAL') NOT NULL DEFAULT 'DRIP',
    trigger_reason       ENUM('MANUAL_SCHEDULE', 'LOW_MOISTURE_ALERT', 'AUTOMATED_RULE') NOT NULL DEFAULT 'LOW_MOISTURE_ALERT',
    notes                VARCHAR(255) NULL,
    CONSTRAINT chk_irrigation_water CHECK (water_volume_liters >= 0),
    CONSTRAINT chk_irrigation_times CHECK (end_time IS NULL OR end_time >= start_time),
    CONSTRAINT fk_irrigation_field FOREIGN KEY (field_id)
        REFERENCES field (field_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_irrigation_field ON irrigation (field_id);
CREATE INDEX idx_irrigation_start_time ON irrigation (start_time);

-- ============================================================================
-- 8. HARVEST TABLE
-- Purpose: Output yields, quality gradings, and market value per planting cycle.
-- Dependency: References planting(planting_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS harvest (
    harvest_id         INT AUTO_INCREMENT PRIMARY KEY,
    planting_id        INT NOT NULL,
    harvest_date       DATE NOT NULL,
    yield_quantity_kg  DECIMAL(10, 2) NOT NULL,
    quality_grade      ENUM('A', 'B', 'C', 'REJECTED') NOT NULL DEFAULT 'A',
    market_value_usd   DECIMAL(10, 2) NULL,
    notes              TEXT NULL,
    CONSTRAINT chk_harvest_yield CHECK (yield_quantity_kg >= 0),
    CONSTRAINT chk_harvest_value CHECK (market_value_usd IS NULL OR market_value_usd >= 0),
    CONSTRAINT fk_harvest_planting FOREIGN KEY (planting_id)
        REFERENCES planting (planting_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_harvest_planting ON harvest (planting_id);
CREATE INDEX idx_harvest_date ON harvest (harvest_date);

-- ============================================================================
-- 9. EXPENSE TABLE
-- Purpose: Tracks operational, input, and maintenance expenditures per farm.
-- Dependencies: References farm(farm_id), optionally field(field_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS expense (
    expense_id    INT AUTO_INCREMENT PRIMARY KEY,
    farm_id       INT NOT NULL,
    field_id      INT NULL,
    expense_date  DATE NOT NULL,
    category      ENUM('SEEDS', 'FERTILIZER', 'IRRIGATION_WATER', 'LABOR', 'EQUIPMENT_MAINTENANCE', 'SENSOR_HARDWARE', 'OTHER') NOT NULL,
    amount_usd    DECIMAL(10, 2) NOT NULL,
    description   VARCHAR(255) NOT NULL,
    CONSTRAINT chk_expense_amount CHECK (amount_usd > 0),
    CONSTRAINT fk_expense_farm FOREIGN KEY (farm_id)
        REFERENCES farm (farm_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_expense_field FOREIGN KEY (field_id)
        REFERENCES field (field_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_expense_farm ON expense (farm_id);
CREATE INDEX idx_expense_field ON expense (field_id);
CREATE INDEX idx_expense_date ON expense (expense_date);
CREATE INDEX idx_expense_category ON expense (category);

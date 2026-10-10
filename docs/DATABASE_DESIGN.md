# Smart Farm DBMS — Database Architecture & Relational Design

**Project:** Smart Farm Database Management System  
**Engine:** MySQL 8.0+ / 8.4 LTS (InnoDB Storage Engine)  
**Document:** Relational Design, Data Dictionary, and Architecture Specification  

---

## 1. Architectural Overview & Design Philosophy

The **Smart Farm Database Management System (DBMS)** is designed as a relational foundation for precision agriculture. It models the core hierarchy of modern farming:
1. **Physical Hierarchy:** Farm $\rightarrow$ Fields $\rightarrow$ IoT Sensor Hardware.
2. **Agronomic Cycle:** Crops $\rightarrow$ Planting Cycles $\rightarrow$ Harvest Yields.
3. **Telemetry & Operations:** High-frequency Sensor Readings, Targeted Irrigation Events, and Financial Expenses.

### Core Architectural Decisions:
- **Separation of Hardware & Telemetry:** Physical sensor devices (`sensor`) are strictly separated from time-series measurement streams (`sensor_reading`). This avoids duplicating device metadata (type, calibration, unit) across millions of readings.
- **Traceability of Simulated vs. Real Data:** The `sensor_reading` table includes a dedicated `data_source` column (`SIMULATED` vs. `REAL`), allowing synthetic laboratory generation without corrupting genuine hardware signals.
- **Third Normal Form (3NF) Compliance:** Transitive and partial dependencies are eliminated. Crop agronomic requirements (such as ideal moisture levels) reside in `crop`, while specific seasonal field assignments reside in `planting`.
- **Strict Integrity Constraints:** Check constraints validate positive acreage, valid moisture ranges ($0-100\%$), chronologically valid harvest dates, and positive financial expenditures.

---

## 2. Table Creation Order & Dependency Graph

To respect foreign-key referential integrity during execution, tables must be constructed in the following strict topological order:

```text
1. farm                   (No external FK dependencies)
2. crop                   (No external FK dependencies)
3. field                  (Depends on farm)
4. planting               (Depends on field, crop)
5. sensor                 (Depends on field)
6. sensor_reading         (Depends on sensor)
7. irrigation             (Depends on field)
8. harvest                (Depends on planting)
9. expense                (Depends on farm, field)
```

---

## 3. Data Dictionary

### Table 1: `farm`
| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `farm_id` | `INT` | No | *AUTO_INC* | **PK** | Unique identifier for each farm |
| `farm_name` | `VARCHAR(100)`| No | | **UNIQUE** | Registered name of the agricultural property |
| `owner_name` | `VARCHAR(100)`| No | | | Primary farm operator or estate owner |
| `location` | `VARCHAR(150)`| No | | | Geographic region, county, or coordinates |
| `total_area_hectares` | `DECIMAL(8,2)` | No | | `CHECK (> 0)` | Total physical boundary area in hectares |
| `created_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | | Registration timestamp |

---

### Table 2: `crop`
| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `crop_id` | `INT` | No | *AUTO_INC* | **PK** | Unique identifier for crop catalog entry |
| `crop_name` | `VARCHAR(80)` | No | | `UNIQUE(crop_name, variety)` | Crop species (e.g., Tomato, Wheat, Corn) |
| `variety` | `VARCHAR(80)` | No | `'Standard'`| | Specific cultivar/hybrid (e.g., Roma, Golden Sweet) |
| `optimal_soil_moisture_min` | `DECIMAL(5,2)` | No | | `CHECK (0..100)` | Lower threshold of acceptable soil moisture (%) |
| `optimal_soil_moisture_max` | `DECIMAL(5,2)` | No | | `CHECK (max >= min)`| Upper threshold of acceptable soil moisture (%) |
| `optimal_temp_celsius_min` | `DECIMAL(5,2)` | No | | | Minimum recommended temperature (°C) |
| `optimal_temp_celsius_max` | `DECIMAL(5,2)` | No | | `CHECK (max >= min)`| Maximum recommended temperature (°C) |
| `growth_duration_days` | `INT` | No | | `CHECK (> 0)` | Typical days from planting to maturity |

---

### Table 3: `field`
| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `field_id` | `INT` | No | *AUTO_INC* | **PK** | Unique identifier for agricultural field |
| `farm_id` | `INT` | No | | **FK** $\rightarrow$ `farm(farm_id)` | Owning farm property |
| `field_name` | `VARCHAR(80)` | No | | `UNIQUE(farm_id, field_name)` | Plot label within farm (e.g., "North Field 1") |
| `area_hectares` | `DECIMAL(8,2)` | No | | `CHECK (> 0)` | Cultivable area of this specific parcel |
| `soil_type` | `VARCHAR(50)` | No | | | Agronomic classification (e.g., Clay, Loam, Sandy) |
| `created_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | | Record timestamp |

---

### Table 4: `planting`
| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `planting_id` | `INT` | No | *AUTO_INC* | **PK** | Unique identifier for cultivation cycle |
| `field_id` | `INT` | No | | **FK** $\rightarrow$ `field(field_id)` | Field allocated to this crop cycle |
| `crop_id` | `INT` | No | | **FK** $\rightarrow$ `crop(crop_id)` | Crop being grown |
| `planting_date` | `DATE` | No | | | Date seeds or seedlings were planted |
| `expected_harvest_date`| `DATE` | Yes | `NULL` | `CHECK (harvest >= plant)`| Projected maturation date |
| `status` | `ENUM` | No | `'GROWING'` | `PLANNED, GROWING, HARVESTED, FAILED` | Current phase of the crop lifecycle |
| `planted_area_hectares`| `DECIMAL(8,2)` | No | | `CHECK (> 0)` | Portion of field currently planted |
| `notes` | `TEXT` | Yes | `NULL` | | Observations, seed lot batch, or fertilizer notes |

---

### Table 5: `sensor`
| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `sensor_id` | `INT` | No | *AUTO_INC* | **PK** | Hardware entity identifier |
| `field_id` | `INT` | No | | **FK** $\rightarrow$ `field(field_id)` | Physical field where node is installed |
| `sensor_code` | `VARCHAR(50)` | No | | **UNIQUE** | Hardware serial / asset code (e.g., SNS-FLD1-SM01) |
| `sensor_type` | `ENUM` | No | | `SOIL_MOISTURE, AIR_TEMPERATURE, HUMIDITY, LIGHT` | Parameter measured |
| `unit_of_measurement` | `VARCHAR(20)` | No | | | Standard metric unit (e.g., %, °C, %RH, lux) |
| `status` | `ENUM` | No | `'ACTIVE'` | `ACTIVE, INACTIVE, FAULTY, MAINTENANCE` | Hardware operating state |
| `installation_date` | `DATE` | No | | | Date unit was deployed in the field |

---

### Table 6: `sensor_reading`
| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `reading_id` | `BIGINT` | No | *AUTO_INC* | **PK** | High-capacity sequential reading identifier |
| `sensor_id` | `INT` | No | | **FK** $\rightarrow$ `sensor(sensor_id)` | Originating sensor node |
| `recorded_at` | `TIMESTAMP` | No | `CURRENT_TIMESTAMP` | | Precision recording timestamp |
| `reading_value` | `DECIMAL(8,2)` | No | | | Measured numeric metric |
| `data_source` | `ENUM` | No | `'SIMULATED'`| `SIMULATED, REAL` | Distinguishes physical vs. synthetic readings |
| `is_valid` | `BOOLEAN` | No | `TRUE` | | Quality flag (FALSE marks outliers/sensor glitch) |

---

### Table 7: `irrigation`
| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `irrigation_id` | `INT` | No | *AUTO_INC* | **PK** | Unique identifier for irrigation event |
| `field_id` | `INT` | No | | **FK** $\rightarrow$ `field(field_id)` | Field that received water |
| `start_time` | `DATETIME` | No | | | Activation timestamp |
| `end_time` | `DATETIME` | Yes | `NULL` | `CHECK (end >= start)` | Valve shutoff timestamp |
| `water_volume_liters` | `DECIMAL(10,2)`| No | | `CHECK (>= 0)` | Total volume discharged in liters |
| `irrigation_method` | `ENUM` | No | `'DRIP'` | `DRIP, SPRINKLER, FLOOD, MANUAL` | Water delivery system used |
| `trigger_reason` | `ENUM` | No | `'LOW_MOISTURE_ALERT'` | `MANUAL_SCHEDULE, LOW_MOISTURE_ALERT, AUTOMATED_RULE` | Reason system initiated watering |
| `notes` | `VARCHAR(255)`| Yes| `NULL` | | Operational notes |

---

### Table 8: `harvest`
| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `harvest_id` | `INT` | No | *AUTO_INC* | **PK** | Harvest event identifier |
| `planting_id` | `INT` | No | | **FK** $\rightarrow$ `planting(planting_id)` | Crop cycle harvested |
| `harvest_date` | `DATE` | No | | | Date of harvest collection |
| `yield_quantity_kg` | `DECIMAL(10,2)`| No | | `CHECK (>= 0)` | Weight produced in kilograms |
| `quality_grade` | `ENUM` | No | `'A'` | `A, B, C, REJECTED` | Commercial produce grade |
| `market_value_usd` | `DECIMAL(10,2)`| Yes | `NULL` | `CHECK (>= 0)` | Realized or estimated gross revenue |
| `notes` | `TEXT` | Yes | `NULL` | | Quality commentary, moisture at harvest |

---

### Table 9: `expense`
| Column | Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `expense_id` | `INT` | No | *AUTO_INC* | **PK** | Ledger entry identifier |
| `farm_id` | `INT` | No | | **FK** $\rightarrow$ `farm(farm_id)` | Farm bearing the expense |
| `field_id` | `INT` | Yes | `NULL` | **FK** $\rightarrow$ `field(field_id)` | Optional field attribution (`NULL` = general overhead)|
| `expense_date` | `DATE` | No | | | Transaction date |
| `category` | `ENUM` | No | | `SEEDS, FERTILIZER, IRRIGATION_WATER, LABOR, EQUIPMENT_MAINTENANCE, SENSOR_HARDWARE, OTHER` | Expense budget line item |
| `amount_usd` | `DECIMAL(10,2)`| No | | `CHECK (> 0)` | Monetary expenditure in USD |
| `description` | `VARCHAR(255)` | No | | | Transaction memo / invoice details |

---

## 4. Indexing Strategy & Performance Considerations

1. **Composite Sensor Telemetry Index:**  
   `idx_reading_sensor_time (sensor_id, recorded_at DESC)`  
   *Reason:* IoT applications continually query: *"What is the latest reading for sensor X?"* and *"Show sensor X between 08:00 and 12:00"*. A composite index on `(sensor_id, recorded_at DESC)` allows MySQL to satisfy both queries using a direct B-tree range scan without sorting in memory.
2. **Foreign Key Performance Indexes:**  
   Indexed lookups are defined on all foreign keys (`field_id`, `crop_id`, `farm_id`, `planting_id`) to accelerate JOIN operations across master-detail hierarchies.
3. **Analytical Filtering Indexes:**  
   Indexes on `recorded_at`, `status`, `expense_date`, and `harvest_date` optimize date-range aggregation reports and dashboard calculations.

---

## 5. Execution Instructions

### Using MySQL Workbench
1. Launch **MySQL Workbench** and connect to your local MySQL Server instance (`localhost:3306`).
2. Open the file: `sql/01_schema.sql` via **File $\rightarrow$ Open SQL Script...**.
3. Click the **Execute (Lightning Bolt)** icon or press `Ctrl + Shift + Enter`.
4. In the **SCHEMAS** panel on the left, right-click and click **Refresh All**. Verify `smart_farm_db` appears with all 9 tables.

### Using MySQL Command-Line Client
```powershell
# Open PowerShell and run MySQL client (adjust user/port as configured)
mysql -u root -p < "sql\01_schema.sql"
```

---

## 6. Verification Status

> [!WARNING]
> **Static Verification Notice:**  
> As identified in the [Environment Audit](file:///c:/Users/activ/OneDrive/Attachments/Desktop/DBMS-%20Project/docs/ENVIRONMENT_AUDIT.md), MySQL Server is currently not active in this local environment.  
> This schema has been statically validated for MySQL 8.0+ syntax compliance, topological foreign-key integrity, and constraint correctness. **Live execution against a running database server will take place once MySQL Server is started.**

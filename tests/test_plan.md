# Smart Farm DBMS — Test Plan & Expected Results (Workload 02)

**Project:** Smart Farm Database Management System  
**Engine:** MySQL 8.x (InnoDB Storage Engine)  
**Document:** Workload 02 Test Strategy, Query Assertions, and Output Validation  

---

## 1. Execution Order & Pipeline

Execute the project scripts in the following exact order:

```text
1. sql/01_schema.sql         -> Creates smart_farm_db database, 9 tables, constraints, and indexes
2. sql/02_sample_data.sql    -> Safely seeds repeatable master and operational records (INSERT IGNORE)
3. sql/03_reports.sql        -> Executes the 10 demonstration queries and registers the view
4. tests/test_plan.md        -> Validates actual outputs against expected results below
```

---

## 2. Environment Verification Status

> [!NOTE]
> **Environment Update (Phase 2):**  
> - **MySQL Server Status:** Windows Service `MySQL8` is actively **RUNNING** on `localhost:3306` (PID 1924 / 16480).
> - **Authentication:** The `root` user requires password authentication (`ERROR 1045` on passwordless shell connection).
> - **Execution Method:** SQL scripts can be executed directly inside **MySQL Workbench** or via the CLI with `-u root -p`.
> - **Automated Static & Python Tests:** 11/11 tests **PASSED** in `tests/test_validation.py`. Detailed verification logs are maintained in [docs/TEST_RESULTS.md](file:///c:/Users/activ/OneDrive/Attachments/Desktop/DBMS-%20Project/docs/TEST_RESULTS.md).

---

## 3. Query-by-Query Expected Results Matrix

### Query 1: INSERT New Record
- **Action:** Inserts simulated reading `reading_id = 15` for Sensor #2 (`32.40 °C` at `2026-10-10 16:00:00`).
- **Expected Outcome:** `1 row affected` on first run (`0 rows affected, 1 warning` on subsequent runs due to `INSERT IGNORE`).
- **Validation:** `SELECT COUNT(*) FROM sensor_reading WHERE reading_id = 15;` returns `1`.

---

### Query 2: SELECT and WHERE Filtering
- **Action:** Filters for ACTIVE sensors located in fields with Loam or Clay soil types.
- **Expected Outcome:** Returns **5 rows**:
  - `SNS-FLD1-SM01` (Field: North Parcel Alpha, Soil: Clay Loam)
  - `SNS-FLD1-TMP01` (Field: North Parcel Alpha, Soil: Clay Loam)
  - `SNS-FLD2-SM01` (Field: Polyhouse Block 1, Soil: Sandy Loam)
  - `SNS-FLD2-TMP01` (Field: Polyhouse Block 1, Soil: Sandy Loam)
  - `SNS-FLD4-SM01` (Field: West Ridge Terrace, Soil: Loam)

---

### Query 3: UPDATE an Existing Record
- **Action:** Updates notes for `planting_id = 1` without touching any other records.
- **Expected Outcome:** `Rows matched: 1  Changed: 1` (or `Changed: 0` on repeat run).
- **Validation:** Notes for planting #1 contains `[Inspection Note: First harvest commenced early October.]`.

---

### Query 4: Multi-Table JOIN (Farm $\rightarrow$ Field $\rightarrow$ Planting $\rightarrow$ Crop)
- **Action:** Joins ownership hierarchy with active and past crop cultivation cycles.
- **Expected Outcome:** Returns **4 rows**:
  | Farm | Field | Crop | Variety | Status | Planted Area |
  | :--- | :--- | :--- | :--- | :--- | :---: |
  | Green Valley Agro Estate | North Parcel Alpha | Tomato | Roma | GROWING | 12.00 ha |
  | Green Valley Agro Estate | Polyhouse Block 1 | Lettuce | Butterhead | GROWING | 5.00 ha |
  | SunRidge Precision Acres | South Basin Plot | Wheat | Durum | HARVESTED | 24.00 ha |
  | SunRidge Precision Acres | West Ridge Terrace | Corn | Sweet Maize | HARVESTED | 18.00 ha |

---

### Query 5: GROUP BY & Aggregation (Harvest Totals)
- **Action:** Computes total kilograms harvested, gross revenue, and yield per hectare grouped by crop.
- **Expected Outcome:** Returns **3 summary rows**:
  | Crop | Variety | Harvest Count | Total Yield (kg) | Total Revenue (USD) | Avg Yield (kg/ha) |
  | :--- | :--- | :---: | :---: | :---: | :---: |
  | Wheat | Durum | 1 | 43,200.00 | $15,120.00 | 1,800.00 |
  | Corn | Sweet Maize | 1 | 31,500.00 | $9,450.00 | 1,750.00 |
  | Tomato | Roma | 1 | 1,800.00 | $2,700.00 | 150.00 |

---

### Query 6: Expense Totals per Farm
- **Action:** Summarizes operational expenditures per farm property.
- **Expected Outcome:** Returns **2 summary rows**:
  | Farm Name | Total Transactions | Total Spent (USD) | Avg Transaction (USD) |
  | :--- | :---: | :---: | :---: |
  | Green Valley Agro Estate | 4 | $3,400.00 | $850.00 |
  | SunRidge Precision Acres | 3 | $3,290.00 | $1,096.67 |

---

### Query 7: Latest Sensor Reading per Sensor (Window Function)
- **Action:** Retrieves the single most recent telemetry value for each sensor device using `ROW_NUMBER()`.
- **Expected Outcome:** Returns exactly **6 rows** (one per registered sensor):
  | Sensor Code | Sensor Type | Unit | Latest Value | Latest Timestamp | Data Source |
  | :--- | :--- | :---: | :---: | :--- | :--- |
  | `SNS-FLD1-SM01` | `SOIL_MOISTURE` | `%` | `44.80` | `2026-10-10 14:00:00` | `SIMULATED` |
  | `SNS-FLD1-TMP01` | `AIR_TEMPERATURE` | `°C` | `32.40` | `2026-10-10 16:00:00` | `SIMULATED` |
  | `SNS-FLD2-SM01` | `SOIL_MOISTURE` | `%` | `71.50` | `2026-10-10 14:00:00` | `SIMULATED` |
  | `SNS-FLD2-TMP01` | `AIR_TEMPERATURE` | `°C` | `23.50` | `2026-10-10 14:00:00` | `SIMULATED` |
  | `SNS-FLD3-SM01` | `SOIL_MOISTURE` | `%` | `48.00` | `2026-09-08 12:00:00` | `SIMULATED` |
  | `SNS-FLD4-SM01` | `SOIL_MOISTURE` | `%` | `58.20` | `2026-09-18 12:00:00` | `SIMULATED` |

---

### Query 8: Low Soil Moisture Alert Report
- **Action:** Identifies moisture sensors reporting values below `@demo_moisture_threshold := 50.00%`.
- **Expected Outcome:** Returns **2 alert rows**:
  1. **North Parcel Alpha** (`SNS-FLD1-SM01`): `44.80%` (Critical low threshold breach)
  2. **South Basin Plot** (`SNS-FLD3-SM01`): `48.00%` (Sub-50% reading)

---

### Query 9: Database View (`v_latest_sensor_readings`)
- **Action:** Creates a reusable virtual view and executes a simple `SELECT` across it.
- **Expected Outcome:** Querying `SELECT * FROM v_latest_sensor_readings;` returns **6 rows** identical to Query 7, proving that the view encapsulates the complex subquery logic.

---

### Query 10: Foreign-Key Integrity Test
- **Action:** Attempts to insert a child row with a non-existent parent foreign key:
  ```sql
  INSERT INTO field (farm_id, field_name, area_hectares, soil_type)
  VALUES (99999, 'Orphaned Field Test', 10.00, 'Loam');
  ```
- **Expected Outcome:** MySQL engine rejects the statement with:
  ```text
  ERROR 1452 (23000): Cannot add or update a child row: a foreign key constraint fails 
  (`smart_farm_db`.`field`, CONSTRAINT `fk_field_farm` FOREIGN KEY (`farm_id`) REFERENCES `farm` (`farm_id`))
  ```

---

## 4. Safety & Repeatability Check

- **Non-Destructive Guarantee:** Scripts contain **no** `DROP DATABASE`, `DROP TABLE`, `TRUNCATE`, or unqualified `DELETE` statements.
- **Idempotent Inserts:** All sample rows in `sql/02_sample_data.sql`, `sql/03_reports.sql`, and `sql/04_simulated_readings.sql` utilize `INSERT IGNORE` or unique constraints, allowing them to be executed repeatedly without causing primary key collision errors.
- **Targeted Updates:** The update statement strictly targets primary key `planting_id = 1`.

---

## 5. Workload 03: Simulated Readings Validation

### Test Case 7: Simulator Execution & Idempotence
- **Action:** Run `python simulator/simulate_readings.py` and execute `sql/04_simulated_readings.sql`.
- **Expected Outcome:** Exactly 18 simulated readings inserted across all 6 sensors.
- **Verification Query:**
  ```sql
  SELECT COUNT(*) FROM sensor_reading WHERE data_source = 'SIMULATED' AND reading_id >= 101;
  ```
  Expected Count: `18`.

### Test Case 8: Simulated Low-Moisture Alert Detection
- **Action:** Run the demonstration irrigation alert query in `sql/04_simulated_readings.sql` with `@demo_irrigation_threshold := 30.00`.
- **Expected Outcome:** Exactly 1 row returned:
  - Sensor `SNS-FLD1-SM01` (North Parcel Alpha) with reading `24.50%` (below the 30% demonstration threshold).


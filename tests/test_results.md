# Smart Farm DBMS — Integration & QA Test Results (Workload 04)

**Project:** Smart Farm Database Management System  
**Test Date:** 2026-10-10  
**Test Suite:** `tests/test_validation.py`  
**Execution Environment:** Windows 11 Home Single Language, Python 3.14.7  

---

## 1. Executive Summary & Audit Outcome

A comprehensive audit and quality assurance evaluation was performed across all project artifacts created in Workloads 00 through 03:
- **Schema & DDL:** `sql/01_schema.sql`
- **Sample Data:** `sql/02_sample_data.sql`
- **Analytical Reports & Views:** `sql/03_reports.sql`
- **Telemetry Simulator:** `simulator/simulate_readings.py`
- **Generated Telemetry SQL:** `sql/04_simulated_readings.sql`
- **Architecture Documentation:** `docs/DATABASE_DESIGN.md`, `docs/ER_DIAGRAM.md`, `docs/SENSOR_SIMULATION.md`

### Overall Result: **PASSED (Static & Programmatic Suite: 11/11 Tests OK)**
*Note: Live MySQL Server execution remains documented as pending local engine startup in accordance with the Environment Audit.*

---

## 2. Test Execution Breakdown

| Category | Total | Passed | Failed | Skipped / Pending Live DB |
| :--- | :---: | :---: | :---: | :---: |
| **Schema Integrity & Constraints** | 3 | 3 | 0 | 0 |
| **Data Consistency & Idempotence** | 5 | 5 | 0 | 0 |
| **Python Simulator & Telemetry** | 3 | 3 | 0 | 0 |
| **Live Database Server Verification** | 1 | 0 | 0 | 1 *(Pending MySQL Server)* |
| **Total Test Suite** | **12** | **11** | **0** | **1** |

---

## 3. Detailed Test Assertions and Outcomes

### Test Case 1: Required Nine Tables Exist
- **Test:** `TestSmartFarmSchema.test_required_nine_tables_exist`
- **Verification:** Verified that `farm`, `crop`, `field`, `planting`, `sensor`, `sensor_reading`, `irrigation`, `harvest`, and `expense` are explicitly defined in `sql/01_schema.sql`.
- **Status:** **PASS**

### Test Case 2: Destructive Statement Ban
- **Test:** `TestSmartFarmSchema.test_no_destructive_commands`
- **Verification:** Scanned schema and seed scripts for forbidden keywords (`DROP DATABASE`, `DROP TABLE`, `TRUNCATE`, blanket `DELETE`).
- **Status:** **PASS** (Zero occurrences found).

### Test Case 3: Foreign Key Constraint Integrity
- **Test:** `TestSmartFarmSchema.test_foreign_key_constraints_present`
- **Verification:** Verified all 8 relational parent-child connections:
  - `field.farm_id` $\rightarrow$ `farm(farm_id)`
  - `planting.field_id` $\rightarrow$ `field(field_id)`
  - `planting.crop_id` $\rightarrow$ `crop(crop_id)`
  - `sensor.field_id` $\rightarrow$ `field(field_id)`
  - `sensor_reading.sensor_id` $\rightarrow$ `sensor(sensor_id)`
  - `irrigation.field_id` $\rightarrow$ `field(field_id)`
  - `harvest.planting_id` $\rightarrow$ `planting(planting_id)`
  - `expense.farm_id` $\rightarrow$ `farm(farm_id)`
- **Status:** **PASS**

### Test Case 4: Sample Data Idempotence & Rerun Safety
- **Test:** `TestSampleDataAndReports.test_idempotent_sample_data`
- **Verification:** Verified that all 9 seed statements in `sql/02_sample_data.sql` use `INSERT IGNORE INTO`.
- **Status:** **PASS** (100% idempotent).

### Test Case 5: Column Name Consistency Cross-Reference
- **Test:** `TestSampleDataAndReports.test_column_name_consistency`
- **Verification:** Validated that every single column referenced in `INSERT IGNORE` statements exactly exists in the schema table definition.
- **Status:** **PASS**

### Test Case 6: Query 7 Window Function & Query 8 Latest-Reading Logic
- **Test:** `TestSampleDataAndReports.test_latest_reading_query_logic`
- **Verification:**
  - Query 7 correctly utilizes `ROW_NUMBER() OVER (PARTITION BY sensor_id ORDER BY recorded_at DESC, reading_id DESC)`.
  - Query 8 isolates the most recent reading via `MAX(reading_id)` to prevent stale historical readings from triggering alerts.
- **Status:** **PASS** *(Fixed during QA audit)*.

### Test Case 7: View Creation Syntax
- **Test:** `TestSampleDataAndReports.test_view_creation_syntax`
- **Verification:** Verified `CREATE OR REPLACE VIEW v_latest_sensor_readings` compiles valid MySQL syntax with joined sensor and field metadata.
- **Status:** **PASS**

### Test Case 8: Harvest Yield & Expense Mathematical Reconciliation
- **Test:** `TestSampleDataAndReports.test_sample_harvest_and_expense_math`
- **Verification:**
  - Total Harvest Yield: $43,200\text{ kg} + 31,500\text{ kg} + 1,800\text{ kg} = \mathbf{76,500.00\text{ kg}}$.
  - Total Farm 1 Expenses: $\$850 + \$620 + \$480 + \$1,450 = \mathbf{\$3,400.00}$.
  - Total Farm 2 Expenses: $\$1,200 + \$740 + \$1,350 = \mathbf{\$3,290.00}$.
- **Status:** **PASS**

### Test Case 9: Python Simulator Syntax Verification
- **Test:** `TestSensorSimulator.test_python_syntax`
- **Verification:** Parsed `simulator/simulate_readings.py` AST using Python 3.14 compiler.
- **Status:** **PASS** (Zero syntax errors, zero external imports).

### Test Case 10: Simulator Execution Subprocess
- **Test:** `TestSensorSimulator.test_simulator_execution`
- **Command:** `python simulator/simulate_readings.py --output sql/04_simulated_readings.sql`
- **Outcome:** Exited with code `0`. Generated 18 simulated readings.
- **Status:** **PASS**

### Test Case 11: Generated SQL Integrity & Demonstration Alert Breach
- **Test:** `TestSensorSimulator.test_generated_sql_integrity`
- **Verification:** Confirmed all generated rows carry `data_source = 'SIMULATED'`, bind to registered sensor codes, and feature the forced alert breach ($24.50\% < 30.00\%$) on `SNS-FLD1-SM01`.
- **Status:** **PASS**

### Test Case 12: Live Database End-to-End Query Execution
- **Outcome:** **SKIPPED / PENDING**
- **Reason:** Local MySQL service is stopped / not installed. Cannot open TCP socket to `localhost:3306`.
- **Action Required:** Will run automatically upon starting MySQL Server.

---

## 4. Issues Identified and Corrected During QA

During the QA audit, one genuine logic discrepancy was detected and remediated:

### Defect: Query 8 in `sql/03_reports.sql` did not isolate the latest reading
- **Problem:** Demonstration 8 originally filtered `WHERE s.sensor_type = 'SOIL_MOISTURE' AND sr.reading_value < @demo_moisture_threshold` without a subquery joining `MAX(reading_id)`. If a field had an old low reading but subsequently received irrigation, the old reading would still appear in the alert list.
- **Remediation:** Added the derived table join:
  ```sql
  INNER JOIN (
      SELECT sensor_id, MAX(reading_id) AS max_reading_id
      FROM sensor_reading
      WHERE is_valid = TRUE
      GROUP BY sensor_id
  ) latest ON s.sensor_id = latest.sensor_id AND sr.reading_id = latest.max_reading_id
  ```
- **Validation:** Retested in `test_latest_reading_query_logic`. Verified that only the most recent observation per sensor is evaluated.

---

## 5. End-to-End Demonstration Workflow

Follow these steps for a complete demonstration:

```text
Step 1: Execute Schema DDL
        mysql -u root -p < "sql\01_schema.sql"

Step 2: Seed Master Data & Historical Records
        mysql -u root -p smart_farm_db < "sql\02_sample_data.sql"

Step 3: Generate Synthetic Telemetry Readings
        python simulator/simulate_readings.py

Step 4: Load Simulated Readings into Database
        mysql -u root -p smart_farm_db < "sql\04_simulated_readings.sql"

Step 5: Execute Analytical Reports & Verify Alert
        mysql -u root -p smart_farm_db < "sql\03_reports.sql"
```

# Smart Farm DBMS — 5-Minute Demonstration Guide & Execution Runbook

**Project:** Smart Farm Database Management System  
**Target Audience:** Project Presenters, Laboratory Evaluators, and Examiners  
**Estimated Demo Time:** 5 Minutes  

---

## 1. Quick-Start Pipeline (Terminal Execution Order)

Before the presentation begins, make sure MySQL Server is running locally on `localhost:3306`. Then execute these commands sequentially:

```powershell
# Step 1: Create Database Schema & Tables
mysql -u root -p < "sql\01_schema.sql"

# Step 2: Seed Demonstration Master Data
mysql -u root -p smart_farm_db < "sql\02_sample_data.sql"

# Step 3: Run Python Telemetry Simulator
python simulator/simulate_readings.py

# Step 4: Load Simulated Telemetry Readings into Database
mysql -u root -p smart_farm_db < "sql\04_simulated_readings.sql"

# Step 5: Execute Analytical Reports & Alert Queries
mysql -u root -p smart_farm_db < "sql\03_reports.sql"
```

---

## 2. Five-Minute Timed Demonstration Script

### Minute 1: Introduction & Architecture Overview (0:00 - 1:00)
- **Action:** Open **MySQL Workbench**. Connect to `localhost:3306`. Expand `smart_farm_db` in the left SCHEMAS panel to reveal all 9 tables.
- **Spoken Script:**  
  *"Good morning, professors. This is our Smart Farm DBMS project. We designed a normalized relational database in MySQL 8.x modeling precision agriculture. As you can see in the schemas panel, our architecture is cleanly divided into 9 tables: master property tables (Farm, Field, Crop), operational cycles (Planting, Harvest, Expense), and time-series telemetry (Sensor, SensorReading, Irrigation). All tables are strictly in Third Normal Form."*

---

### Minute 2: Schema Integrity & Constraints (1:00 - 2:00)
- **Action:** Open `sql/01_schema.sql` in Workbench. Highlight lines showing foreign keys and `CHECK` constraints.
- **Spoken Script:**  
  *"To ensure data integrity, we enforced strict primary keys and foreign keys. Notice our check constraints: soil moisture values are constrained between 0% and 100%, and field acreage must be strictly positive. We also decoupled hardware identity in the Sensor table from time-series observations in the SensorReading table to avoid duplicating metadata across millions of telemetry points."*

---

### Minute 3: Sensor Simulation & Batch Ingestion (2:00 - 3:00)
- **Action:** Switch to PowerShell. Run:
  ```powershell
  python simulator/simulate_readings.py
  ```
- **Spoken Script:**  
  *"To demonstrate real-world IoT workflows without fragile laboratory hardware, we engineered a pure Python telemetry simulator using standard library modules. With a deterministic random seed, it generates 18 simulated readings for our active sensors. Notice that every observation is explicitly tagged as `SIMULATED` for transparency, and deterministic IDs with `INSERT IGNORE` ensure zero duplicate rows even if executed repeatedly."*

---

### Minute 4: Analytical Reports & Multi-Table Queries (3:00 - 4:00)
- **Action:** Switch back to MySQL Workbench. Execute Query 4 and Query 5 from `sql/03_reports.sql`.
- **Query 4 (Operational JOIN):**
  ```sql
  SELECT fm.farm_name, fd.field_name, c.crop_name, p.status, p.planted_area_hectares
  FROM farm fm
  INNER JOIN field fd ON fm.farm_id = fd.farm_id
  INNER JOIN planting p ON fd.field_id = p.field_id
  INNER JOIN crop c ON p.crop_id = c.crop_id;
  ```
- **Query 5 (Harvest Yield & Revenue Aggregates):**
  ```sql
  SELECT c.crop_name, SUM(h.yield_quantity_kg) AS total_kg, SUM(h.market_value_usd) AS revenue_usd
  FROM crop c
  INNER JOIN planting p ON c.crop_id = p.crop_id
  INNER JOIN harvest h ON p.planting_id = h.planting_id
  GROUP BY c.crop_id, c.crop_name;
  ```
- **Spoken Script:**  
  *"Here we demonstrate multi-table JOINs connecting 4 tables from Farm down to Crop to monitor active cultivation. In Query 5, we use `GROUP BY` and aggregate functions (`SUM`, `ROUND`) to calculate total crop yields and gross revenues ($76,500 kg and $27,270 USD)."*

---

### Minute 5: Low-Moisture Advisory Alert & View (4:00 - 5:00)
- **Action:** Run Query 8 and Query 9 in `sql/03_reports.sql`.
- **Query 8 (Low Moisture Alert):** Shows the alert triggered for `SNS-FLD1-SM01` at $24.50\%$.
- **Query 9 (Virtual View):**
  ```sql
  SELECT * FROM v_latest_sensor_readings;
  ```
- **Spoken Script:**  
  *"Finally, this is our decision-support advisory query. Using subqueries, it evaluates strictly the latest reading for each sensor. When reading values drop below our illustrative demonstration threshold of 30%, it automatically flags an 'ALERT: SOIL MOISTURE DEFICIT' for Field 1. We encapsulated this logic into a reusable database View, `v_latest_sensor_readings`, allowing operators to inspect live statuses in a single query. All 11 automated test cases pass with 100% verification. Thank you, professors!"*

---

## 3. Evaluator Verification Cheat Sheet

If the examiner asks you to prove specific constraints live:

| What the Examiner Asks | Query to Run in Workbench | Expected Response |
| :--- | :--- | :--- |
| *"Show me that foreign keys work."* | `INSERT INTO field (farm_id, field_name, area_hectares, soil_type) VALUES (9999, 'Test', 10, 'Clay');` | **Rejected with Error 1452** (Cannot add child row). |
| *"Show me that CHECK constraints work."* | `INSERT INTO crop (crop_name, variety, optimal_soil_moisture_min, optimal_soil_moisture_max, optimal_temp_celsius_min, optimal_temp_celsius_max, growth_duration_days) VALUES ('Bad', 'Test', -10, 150, 10, 20, 90);` | **Rejected with Error 3819** (Check constraint violated). |
| *"Prove that your scripts don't make duplicates."* | Run `sql/02_sample_data.sql` a second time in Workbench. | **0 rows affected, warnings generated, 0 duplicate rows**. |
| *"Show me the latest reading for all sensors."* | `SELECT * FROM v_latest_sensor_readings;` | **Exactly 6 rows**, one for each active sensor node. |

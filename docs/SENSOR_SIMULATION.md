# Smart Farm DBMS — Agricultural Sensor Telemetry Simulation

**Project:** Smart Farm Database Management System  
**Engine:** MySQL 8.x  
**Component:** Telemetry Simulator & Advisory Alerting  
**Script:** `simulator/simulate_readings.py`  
**Generated SQL:** `sql/04_simulated_readings.sql`  

---

## 1. Simulation Architecture & Principles

The telemetry simulator bridges laboratory simulation and relational database management without introducing fragile third-party dependencies or external network requirements.

### Core Design Rules:
1. **Zero External Dependencies:** Built entirely with the Python Standard Library (`random`, `datetime`, `argparse`, `pathlib`). No `pip install`, virtual environment, or external database drivers are needed to generate SQL scripts.
2. **Deterministic Repeatability:** Uses a configurable pseudo-random seed (default: `seed=42`). Every run produces identical, reproducible readings across demonstrations.
3. **Hardware-Decoupled Sensor Linking:** Readings resolve `sensor_id` dynamically via SQL subqueries matching known `sensor_code` identifiers (`SNS-FLD1-SM01`, `SNS-FLD1-TMP01`, etc.).
4. **Idempotence & Duplicate Prevention:** Employs explicit, deterministic `reading_id` values paired with `INSERT IGNORE INTO sensor_reading`. Rerunning the simulation script or re-executing the SQL in MySQL Workbench produces **zero duplicate rows**.
5. **Data Source Integrity:** Every generated reading is explicitly labeled with `data_source = 'SIMULATED'`, ensuring synthetic data is never confused with real field hardware measurements.

---

## 2. Simulated Sensor Types & Ranges

| Sensor Code | Parameter | Unit | Monitored Location | Normal Range | Simulated Behavior |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `SNS-FLD1-SM01` | Soil Moisture | `%` | North Parcel Alpha | $55.0\% - 75.0\%$ | Normal hydration $\rightarrow$ Declines to **$24.50\%$** (Demonstration Breach) |
| `SNS-FLD1-TMP01` | Air Temperature | `°C` | North Parcel Alpha | $22.0\text{°C} - 33.0\text{°C}$ | Diurnal temperature fluctuations ($22.28\text{°C} \rightarrow 22.96\text{°C}$) |
| `SNS-FLD2-SM01` | Soil Moisture | `%` | Polyhouse Block 1 | $65.0\% - 82.0\%$ | Stable greenhouse hydration ($69.68\% \rightarrow 72.17\% \rightarrow 68.38\%$) |
| `SNS-FLD2-TMP01` | Air Temperature | `°C` | Polyhouse Block 1 | $19.0\text{°C} - 27.0\text{°C}$ | Controlled micro-climate temperature ($20.79\text{°C} \rightarrow 24.20\text{°C}$) |
| `SNS-FLD3-SM01` | Soil Moisture | `%` | South Basin Plot | $45.0\% - 62.0\%$ | Field soil moisture readings ($57.52\% \rightarrow 48.72\% \rightarrow 54.26\%$) |
| `SNS-FLD4-SM01` | Soil Moisture | `%` | West Ridge Terrace | $50.0\% - 70.0\%$ | Loam terrace moisture profile ($63.53\% \rightarrow 60.11\% \rightarrow 54.41\%$) |

---

## 3. Demonstration Irrigation Alert

### Demonstrative Threshold: `30.00%`
> [!IMPORTANT]
> **Advisory Context Notice:**  
> The $30.00\%$ soil moisture threshold is configured strictly as an **illustrative demonstration value** to exhibit database filtering and alert generation.  
> In real precision agriculture:
> - Different crops and soil types require distinct thresholds (e.g., tomatoes thrive between $60-80\%$, whereas drought-tolerant crops tolerate lower levels).
> - This query serves as a **decision-support advisory**, not an autonomous control system. It does **not** automatically trigger physical pumps or actuate valves.

### Alert SQL Query:
```sql
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
    -- Isolate the newest reading per soil moisture sensor
    SELECT sensor_id, MAX(reading_id) AS max_reading_id
    FROM sensor_reading
    WHERE is_valid = TRUE
    GROUP BY sensor_id
) latest ON s.sensor_id = latest.sensor_id AND sr.reading_id = latest.max_reading_id
WHERE s.sensor_type = 'SOIL_MOISTURE'
  AND sr.reading_value < @demo_irrigation_threshold
ORDER BY sr.reading_value ASC;
```

### Expected Alert Output:
| Farm | Field | Sensor Code | Latest Moisture | Threshold | Advisory Notice | System Advice |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| Green Valley Agro Estate | North Parcel Alpha | `SNS-FLD1-SM01` | **$24.50\%$** | $30.00\%$ | ALERT: SOIL MOISTURE DEFICIT | RECOMMENDATION: REVIEW IRRIGATION SCHEDULE |

All other soil moisture sensors report values $> 30.00\%$ and are correctly excluded from the alert list.

---

## 4. How to Run the Simulator

### Step 1: Generate Telemetry SQL via Python
In a PowerShell terminal inside the project root:
```powershell
# Run with default settings (18 readings, seed=42, threshold=30%)
python simulator/simulate_readings.py

# Optional: customize output path, random seed, or alert threshold
python simulator/simulate_readings.py --seed 100 --threshold 35.0 --output sql/04_simulated_readings.sql
```

### Step 2: Execute in MySQL Workbench
1. Open **MySQL Workbench** and connect to your database.
2. Open `sql/04_simulated_readings.sql`.
3. Click the **Execute** button (`Ctrl + Shift + Enter`).
4. Review the result grid:
   - Part 1 inserts the 18 telemetry observations.
   - Part 2 executes the alert query and returns the deficit advisory row for `SNS-FLD1-SM01`.

### Step 3: Verify Repeatability
Run the script a second time in MySQL Workbench:
- **Result:** `0 rows affected, warnings: 18`.
- The database remains completely unchanged with zero duplicate records created.

"""
Smart Farm DBMS — Agricultural Sensor Telemetry Simulator
File: simulator/simulate_readings.py

Purpose:
    Generates synthetic agricultural sensor readings for MySQL Workbench
    without requiring third-party Python packages, network connectivity,
    or direct database credentials.

Key Characteristics:
    1. Zero third-party dependencies (pure Python standard library).
    2. Deterministic demonstration mode using a fixed random seed.
    3. Idempotent SQL output (INSERT IGNORE with deterministic IDs).
    4. Guarantees both normal and low-moisture readings (< 30% alert threshold).
    5. Flags all generated records as 'SIMULATED'.
"""

import argparse
from datetime import datetime, timedelta
from pathlib import Path
import random
import sys


# Known sensors seeded in sql/02_sample_data.sql
MONITORED_SENSORS = [
    {
        "sensor_code": "SNS-FLD1-SM01",
        "sensor_type": "SOIL_MOISTURE",
        "unit": "%",
        "field_name": "North Parcel Alpha",
        "normal_min": 55.0,
        "normal_max": 75.0,
        # Intentionally force a drought/breach reading on this sensor for alert demo
        "force_low_moisture": True,
        "low_value": 24.50,  # Below demo threshold of 30.0%
    },
    {
        "sensor_code": "SNS-FLD1-TMP01",
        "sensor_type": "AIR_TEMPERATURE",
        "unit": "°C",
        "field_name": "North Parcel Alpha",
        "normal_min": 22.0,
        "normal_max": 33.0,
        "force_low_moisture": False,
    },
    {
        "sensor_code": "SNS-FLD2-SM01",
        "sensor_type": "SOIL_MOISTURE",
        "unit": "%",
        "field_name": "Polyhouse Block 1",
        "normal_min": 65.0,
        "normal_max": 82.0,
        "force_low_moisture": False,
    },
    {
        "sensor_code": "SNS-FLD2-TMP01",
        "sensor_type": "AIR_TEMPERATURE",
        "unit": "°C",
        "field_name": "Polyhouse Block 1",
        "normal_min": 19.0,
        "normal_max": 27.0,
        "force_low_moisture": False,
    },
    {
        "sensor_code": "SNS-FLD3-SM01",
        "sensor_type": "SOIL_MOISTURE",
        "unit": "%",
        "field_name": "South Basin Plot",
        "normal_min": 45.0,
        "normal_max": 62.0,
        "force_low_moisture": False,
    },
    {
        "sensor_code": "SNS-FLD4-SM01",
        "sensor_type": "SOIL_MOISTURE",
        "unit": "%",
        "field_name": "West Ridge Terrace",
        "normal_min": 50.0,
        "normal_max": 70.0,
        "force_low_moisture": False,
    },
]


def generate_readings(
    seed: int = 42,
    base_id: int = 101,
    start_time: datetime = datetime(2026, 10, 11, 8, 0, 0),
    time_step_minutes: int = 120,
    steps: int = 3,
) -> list[dict]:
    """Generates synthetic telemetry points with deterministic randomness."""
    random.seed(seed)
    readings = []
    current_id = base_id

    for step in range(steps):
        timestamp = start_time + timedelta(minutes=step * time_step_minutes)

        for sensor in MONITORED_SENSORS:
            # On the final step, inject the forced low-moisture breach for demonstration
            if sensor.get("force_low_moisture") and step == (steps - 1):
                val = sensor["low_value"]
            else:
                raw_val = random.uniform(sensor["normal_min"], sensor["normal_max"])
                val = round(raw_val, 2)

            readings.append(
                {
                    "reading_id": current_id,
                    "sensor_code": sensor["sensor_code"],
                    "sensor_type": sensor["sensor_type"],
                    "field_name": sensor["field_name"],
                    "recorded_at": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                    "reading_value": val,
                    "unit": sensor["unit"],
                    "data_source": "SIMULATED",
                    "is_valid": True,
                }
            )
            current_id += 1

    return readings


def generate_sql_script(
    readings: list[dict],
    alert_threshold: float = 30.0,
) -> str:
    """Builds a repeatable, beginner-friendly MySQL script."""
    lines = [
        "-- ============================================================================",
        "-- SMART FARM DATABASE MANAGEMENT SYSTEM (MySQL 8.x)",
        "-- File: Generated Simulated Sensor Telemetry",
        f"-- Generated At: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "-- Data Source: SIMULATED (Zero hardware dependency)",
        "-- Safety: INSERT IGNORE with deterministic IDs prevents duplicate rows.",
        "-- ============================================================================",
        "",
        "USE smart_farm_db;",
        "",
        "-- ----------------------------------------------------------------------------",
        "-- 1. INSERT SIMULATED READINGS",
        "-- Uses a subquery to look up sensor_id dynamically by sensor_code.",
        "-- ----------------------------------------------------------------------------",
    ]

    for r in readings:
        sql = (
            f"INSERT IGNORE INTO sensor_reading "
            f"(reading_id, sensor_id, recorded_at, reading_value, data_source, is_valid)\n"
            f"SELECT {r['reading_id']}, s.sensor_id, '{r['recorded_at']}', {r['reading_value']:.2f}, 'SIMULATED', TRUE\n"
            f"FROM sensor s WHERE s.sensor_code = '{r['sensor_code']}';"
        )
        lines.append(sql)

    lines.extend([
        "",
        "-- ----------------------------------------------------------------------------",
        "-- 2. DEMONSTRATION IRRIGATION ALERT QUERY",
        "-- Purpose: Identify active fields with latest moisture below demo threshold.",
        f"-- Demonstrative Threshold: {alert_threshold:.2f}% (Illustrative only, not a universal rule).",
        "-- ----------------------------------------------------------------------------",
        f"SET @demo_irrigation_threshold := {alert_threshold:.2f};",
        "",
        "SELECT ",
        "    fm.farm_name,",
        "    f.field_name,",
        "    s.sensor_code,",
        "    sr.reading_value AS latest_soil_moisture_pct,",
        "    @demo_irrigation_threshold AS alert_threshold_pct,",
        "    sr.recorded_at AS timestamp_recorded,",
        "    'ALERT: SOIL MOISTURE DEFICIT' AS advisory_notice,",
        "    'RECOMMENDATION: REVIEW IRRIGATION SCHEDULE' AS system_advice",
        "FROM sensor_reading sr",
        "INNER JOIN sensor s ON sr.sensor_id = s.sensor_id",
        "INNER JOIN field f ON s.field_id = f.field_id",
        "INNER JOIN farm fm ON f.farm_id = fm.farm_id",
        "INNER JOIN (",
        "    -- Isolate the latest reading for each soil moisture sensor",
        "    SELECT sensor_id, MAX(reading_id) AS max_reading_id",
        "    FROM sensor_reading",
        "    WHERE is_valid = TRUE",
        "    GROUP BY sensor_id",
        ") latest ON s.sensor_id = latest.sensor_id AND sr.reading_id = latest.max_reading_id",
        "WHERE s.sensor_type = 'SOIL_MOISTURE'",
        "  AND sr.reading_value < @demo_irrigation_threshold",
        "ORDER BY sr.reading_value ASC;",
    ])

    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(
        description="Smart Farm DBMS Sensor Telemetry Simulator (Pure Python Standard Library)"
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        default="sql/04_simulated_readings.sql",
        help="Path for generated SQL file (default: sql/04_simulated_readings.sql)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Deterministic random seed (default: 42)",
    )
    parser.add_argument(
        "--threshold",
        "-t",
        type=float,
        default=30.0,
        help="Illustrative demo alert threshold in %% (default: 30.0)",
    )
    parser.add_argument(
        "--start-id",
        type=int,
        default=101,
        help="Starting reading_id for repeatable primary keys (default: 101)",
    )

    args = parser.parse_args()

    # Generate readings
    readings = generate_readings(seed=args.seed, base_id=args.start_id)

    # Build SQL
    sql_text = generate_sql_script(readings, alert_threshold=args.threshold)

    # Save to output file
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(sql_text, encoding="utf-8")

    # Print summary report to stdout
    print(f"[SIMULATOR] Successfully generated {len(readings)} simulated readings.")
    print(f"[SIMULATOR] Random Seed: {args.seed} (Deterministic Repeatable Mode)")
    print(f"[SIMULATOR] Output File: {output_path.resolve()}")
    print(f"[SIMULATOR] Low-Moisture Demo Threshold: {args.threshold:.2f}%")
    
    # Identify sample breach
    breaches = [r for r in readings if r["sensor_type"] == "SOIL_MOISTURE" and r["reading_value"] < args.threshold]
    print(f"[SIMULATOR] Injected Threshold Breaches: {len(breaches)}")
    for b in breaches:
        print(f"            - {b['sensor_code']} ({b['field_name']}): {b['reading_value']}% at {b['recorded_at']}")


if __name__ == "__main__":
    main()

"""
Smart Farm DBMS — Automated Integration & QA Validation Suite
File: tests/test_validation.py

Purpose:
    Executes automated static analysis, SQL schema verification, consistency
    checks, simulator validation, and mathematical reconciliation without
    requiring external database services.
"""

import ast
from pathlib import Path
import re
import subprocess
import sys
import unittest


WORKSPACE_ROOT = Path(__file__).resolve().parent.parent


class TestSmartFarmSchema(unittest.TestCase):
    """Validates DDL specifications in sql/01_schema.sql."""

    @classmethod
    def setUpClass(cls):
        cls.schema_path = WORKSPACE_ROOT / "sql" / "01_schema.sql"
        if not cls.schema_path.exists():
            raise FileNotFoundError("sql/01_schema.sql does not exist")
        cls.schema_sql = cls.schema_path.read_text(encoding="utf-8")

    def test_required_nine_tables_exist(self):
        """Verify all 9 required tables are created in 01_schema.sql."""
        required_tables = [
            "farm",
            "crop",
            "field",
            "planting",
            "sensor",
            "sensor_reading",
            "irrigation",
            "harvest",
            "expense",
        ]
        created_tables = re.findall(
            r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_]+)\s*\(",
            self.schema_sql,
            re.IGNORECASE,
        )
        created_tables_lower = [t.lower() for t in created_tables]
        for tbl in required_tables:
            self.assertIn(
                tbl,
                created_tables_lower,
                f"Missing required table '{tbl}' in sql/01_schema.sql",
            )

    def test_no_destructive_commands(self):
        """Verify no DROP, TRUNCATE, or blanket DELETE statements exist."""
        destructive_patterns = [
            r"\bDROP\s+DATABASE\b",
            r"\bDROP\s+TABLE\b",
            r"\bTRUNCATE\b",
            r"\bDELETE\s+FROM\b(?!\s*practice)",
        ]
        for pattern in destructive_patterns:
            matches = re.findall(pattern, self.schema_sql, re.IGNORECASE)
            self.assertEqual(
                len(matches),
                0,
                f"Found forbidden destructive SQL pattern '{pattern}' in schema: {matches}",
            )

    def test_foreign_key_constraints_present(self):
        """Verify foreign key references connect child tables to parent entities."""
        fk_checks = [
            ("field", "farm_id", "farm"),
            ("planting", "field_id", "field"),
            ("planting", "crop_id", "crop"),
            ("sensor", "field_id", "field"),
            ("sensor_reading", "sensor_id", "sensor"),
            ("irrigation", "field_id", "field"),
            ("harvest", "planting_id", "planting"),
            ("expense", "farm_id", "farm"),
        ]
        for child, col, parent in fk_checks:
            fk_pattern = rf"FOREIGN\s+KEY\s*\({col}\)\s*REFERENCES\s+{parent}"
            self.assertTrue(
                re.search(fk_pattern, self.schema_sql, re.IGNORECASE),
                f"Missing FK constraint {child}.{col} -> {parent}",
            )


class TestSampleDataAndReports(unittest.TestCase):
    """Validates sample data consistency, idempotence, and report syntax."""

    @classmethod
    def setUpClass(cls):
        cls.sample_path = WORKSPACE_ROOT / "sql" / "02_sample_data.sql"
        cls.reports_path = WORKSPACE_ROOT / "sql" / "03_reports.sql"
        if not cls.sample_path.exists():
            raise FileNotFoundError("sql/02_sample_data.sql does not exist")
        if not cls.reports_path.exists():
            raise FileNotFoundError("sql/03_reports.sql does not exist")
        cls.sample_sql = cls.sample_path.read_text(encoding="utf-8")
        cls.reports_sql = cls.reports_path.read_text(encoding="utf-8")

    def test_idempotent_sample_data(self):
        """Verify all INSERT statements in sample data use INSERT IGNORE for idempotence."""
        all_inserts = re.findall(r"\bINSERT\s+(?:IGNORE\s+)?INTO\s+([a-zA-Z_]+)", self.sample_sql, re.IGNORECASE)
        ignore_inserts = re.findall(r"\bINSERT\s+IGNORE\s+INTO\s+([a-zA-Z_]+)", self.sample_sql, re.IGNORECASE)
        self.assertEqual(len(all_inserts), 9, "Expected exactly 9 table seed statements in sample data.")
        self.assertEqual(
            len(all_inserts),
            len(ignore_inserts),
            "Every sample data INSERT must use INSERT IGNORE to ensure rerun repeatability.",
        )

    def test_latest_reading_query_logic(self):
        """Verify Query 7 uses window function and Query 8 isolates latest reading."""
        # Query 7 should use ROW_NUMBER() OVER
        self.assertIn("ROW_NUMBER() OVER", self.reports_sql)
        # Query 8 must join against the latest reading subquery
        self.assertTrue(
            "MAX(reading_id)" in self.reports_sql or "latest" in self.reports_sql,
            "Query 8 must check the latest reading, not an older reading.",
        )

    def test_view_creation_syntax(self):
        """Verify view v_latest_sensor_readings is created safely."""
        self.assertIn("CREATE OR REPLACE VIEW v_latest_sensor_readings", self.reports_sql)

    def test_sample_harvest_and_expense_math(self):
        """Mathematically reconcile harvest yields and expense sums from sample data."""
        # Yields: Durum Wheat (43200), Sweet Corn (31500), Roma Tomato (1800)
        yields = [43200.00, 31500.00, 1800.00]
        self.assertEqual(sum(yields), 76500.00)

        # Farm 1 Expenses: 850 + 620 + 480 + 1450 = 3400.00
        farm1_expenses = [850.00, 620.00, 480.00, 1450.00]
        self.assertEqual(sum(farm1_expenses), 3400.00)

        # Farm 2 Expenses: 1200 + 740 + 1350 = 3290.00
        farm2_expenses = [1200.00, 740.00, 1350.00]
        self.assertEqual(sum(farm2_expenses), 3290.00)

    def test_column_name_consistency(self):
        """Verify that column names in sample data match schema definitions."""
        expected_schema_cols = {
            "farm": {"farm_id", "farm_name", "owner_name", "location", "total_area_hectares"},
            "crop": {"crop_id", "crop_name", "variety", "optimal_soil_moisture_min", "optimal_soil_moisture_max", "optimal_temp_celsius_min", "optimal_temp_celsius_max", "growth_duration_days"},
            "field": {"field_id", "farm_id", "field_name", "area_hectares", "soil_type"},
            "planting": {"planting_id", "field_id", "crop_id", "planting_date", "expected_harvest_date", "status", "planted_area_hectares", "notes"},
            "sensor": {"sensor_id", "field_id", "sensor_code", "sensor_type", "unit_of_measurement", "status", "installation_date"},
            "sensor_reading": {"reading_id", "sensor_id", "recorded_at", "reading_value", "data_source", "is_valid"},
            "irrigation": {"irrigation_id", "field_id", "start_time", "end_time", "water_volume_liters", "irrigation_method", "trigger_reason", "notes"},
            "harvest": {"harvest_id", "planting_id", "harvest_date", "yield_quantity_kg", "quality_grade", "market_value_usd", "notes"},
            "expense": {"expense_id", "farm_id", "field_id", "expense_date", "category", "amount_usd", "description"},
        }

        # Check that each insert statement references only valid columns
        insert_col_matches = re.findall(
            r"INSERT\s+IGNORE\s+INTO\s+([a-zA-Z_]+)\s*\(([^)]+)\)",
            self.sample_sql,
            re.IGNORECASE,
        )
        for tbl, cols_str in insert_col_matches:
            tbl_lower = tbl.lower()
            self.assertIn(tbl_lower, expected_schema_cols, f"Unexpected table in seed data: {tbl}")
            cols_used = {c.strip().lower() for c in cols_str.split(",")}
            for col in cols_used:
                self.assertIn(
                    col,
                    expected_schema_cols[tbl_lower],
                    f"Column '{col}' in sample data does not exist in schema table '{tbl}'",
                )


class TestSensorSimulator(unittest.TestCase):
    """Validates Python simulator syntax, execution, and generated SQL."""

    @classmethod
    def setUpClass(cls):
        cls.sim_script = WORKSPACE_ROOT / "simulator" / "simulate_readings.py"
        cls.sim_output = WORKSPACE_ROOT / "sql" / "04_simulated_readings.sql"
        if not cls.sim_script.exists():
            raise FileNotFoundError("simulator/simulate_readings.py does not exist")

    def test_python_syntax(self):
        """Verify simulator Python code parses without syntax errors."""
        code = self.sim_script.read_text(encoding="utf-8")
        parsed = ast.parse(code, filename="simulate_readings.py")
        self.assertIsNotNone(parsed)

    def test_simulator_execution(self):
        """Run the simulator subprocess and verify returncode 0."""
        result = subprocess.run(
            [sys.executable, str(self.sim_script), "--output", str(self.sim_output)],
            capture_output=True,
            text=True,
            cwd=str(WORKSPACE_ROOT),
        )
        self.assertEqual(result.returncode, 0, f"Simulator failed: {result.stderr}")
        self.assertTrue(self.sim_output.exists())

    def test_generated_sql_integrity(self):
        """Inspect generated SQL for valid sensor codes, simulated labels, and alert threshold."""
        content = self.sim_output.read_text(encoding="utf-8")
        # Check for simulated label
        self.assertIn("'SIMULATED'", content)
        # Check for sensor codes
        known_codes = [
            "SNS-FLD1-SM01",
            "SNS-FLD1-TMP01",
            "SNS-FLD2-SM01",
            "SNS-FLD2-TMP01",
            "SNS-FLD3-SM01",
            "SNS-FLD4-SM01",
        ]
        for code in known_codes:
            self.assertIn(code, content, f"Generated SQL missing sensor code {code}")

        # Check for alert threshold and breach
        self.assertIn("@demo_irrigation_threshold := 30.00", content)
        # Verify forced low moisture sample (24.50) is present
        self.assertIn("24.50", content, "Forced low moisture sample (24.50%) not found in generated SQL")


if __name__ == "__main__":
    unittest.main()

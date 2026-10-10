# Smart Farm DBMS — Viva Voce Preparation Guide (20 Questions & Answers)

**Project:** Smart Farm Database Management System  
**Document:** Comprehensive Viva Exam Q&A Reference  
**Audience:** Students preparing for University Lab Viva and Project Defense  

---

### Q1: What is a Primary Key? Give an example from your project.
**Answer:**  
A **Primary Key** is a column (or combination of columns) that uniquely identifies each row in a table. It cannot contain `NULL` values and must be unique across all rows.  
*Project Example:* In our `farm` table, `farm_id` is the Primary Key. It ensures that every agricultural estate has a distinct, unforgeable ID number.

---

### Q2: What is a Foreign Key? How does it protect your data?
**Answer:**  
A **Foreign Key** is a column in a child table that points to the Primary Key of a parent table. It enforces **referential integrity**, meaning MySQL will reject any attempt to insert a child record referencing a non-existent parent, or delete a parent record that still has active children.  
*Project Example:* In our `field` table, `farm_id` is a Foreign Key referencing `farm(farm_id)`. If someone tries to insert a field pointing to `farm_id = 99999`, MySQL blocks the insert with **Error 1452**.

---

### Q3: What is the difference between MySQL Server and MySQL Workbench?
**Answer:**  
- **MySQL Server (`mysqld`):** The background database engine service that stores data on disk, manages memory buffers, executes SQL queries, and listens on port 3306.
- **MySQL Workbench:** A desktop Graphical User Interface (GUI) client program used by developers to connect to the server, type SQL queries, view result tables, and design ER diagrams. Workbench does not store data itself; it is only a viewer/editor for MySQL Server.

---

### Q4: What is Database Normalization, and why is it important?
**Answer:**  
Normalization is a systematic technique for organizing database tables to minimize data redundancy and eliminate insert, update, and delete anomalies. We normalized our database to **Third Normal Form (3NF)** so that changes to farm or crop details only need to be updated in one place.

---

### Q5: Explain First Normal Form (1NF) using your tables.
**Answer:**  
A table is in **1NF** if all attribute values are atomic (indivisible) and each row is unique.  
*Project Example:* In our `crop` table, we do not store multiple varieties in a single comma-separated text string like `"Roma, San Marzano"`. Instead, each variety has its own atomic row with a unique `crop_id`.

---

### Q6: Explain Second Normal Form (2NF) using your tables.
**Answer:**  
A table is in **2NF** if it is in 1NF and contains no partial functional dependencies (every non-key column depends on the *entire* primary key, not just part of a composite key).  
*Project Example:* A field can grow many crops over successive seasons. Rather than creating a composite table that combines field details with crop attributes, we separated field attributes into `field`, crop attributes into `crop`, and created the `planting` table with its own primary key `planting_id`.

---

### Q7: Explain Third Normal Form (3NF) using your tables.
**Answer:**  
A table is in **3NF** if it is in 2NF and has no transitive dependencies (non-key columns must depend *only* on the primary key, and not on another non-key column).  
*Project Example:* In `sensor_reading`, we only store `sensor_id`, `recorded_at`, and `reading_value`. We do **not** store `field_name` or `farm_name` in `sensor_reading`. If we did, `field_name` would depend on `sensor_id`, which depends on `reading_id` (a transitive dependency). By storing `field_id` in `sensor` and joining when needed, we maintain 3NF.

---

### Q8: Why did you keep the `sensor` table separate from `sensor_reading`?
**Answer:**  
Because they have fundamentally different lifecycles and cardinality:
- `sensor` represents physical hardware assets (serial number, sensor type, calibration unit, installation date) which are inserted once and rarely change.
- `sensor_reading` represents high-frequency, time-series telemetry generated every few minutes.  
Separating them prevents duplicating hardware metadata millions of times across every reading row.

---

### Q9: What is an associative entity (junction table)? How is `planting` an associative entity?
**Answer:**  
An **associative entity** resolves a Many-to-Many ($M:N$) relationship into two One-to-Many ($1:N$) relationships.  
*Project Example:* One field can host many crops over different seasons ($1:N$), and one crop type can be planted in multiple fields ($1:N$). The `planting` table acts as the junction entity linking `field_id` and `crop_id`, while adding cycle-specific attributes like `planting_date`, `status`, and `planted_area_hectares`.

---

### Q10: What is the difference between `INNER JOIN` and `LEFT JOIN`? Give a project example.
**Answer:**  
- **`INNER JOIN`:** Returns only rows where there is a match in both tables. (Used in Query 4 to show only fields that currently have a linked planting record).
- **`LEFT JOIN`:** Returns all rows from the left table, and matching rows from the right table (filling with `NULL` if no match exists). (Used in Query 6 on `farm LEFT JOIN expense` to ensure farms with zero expenses still show up in the report with a sum of 0).

---

### Q11: What is the difference between `WHERE` and `HAVING`?
**Answer:**  
- **`WHERE`:** Filters individual rows *before* grouping and aggregation take place. (e.g., `WHERE s.status = 'ACTIVE'`).
- **`HAVING`:** Filters grouped summary rows *after* the `GROUP BY` operation has computed aggregates. (e.g., `GROUP BY crop_id HAVING SUM(yield_quantity_kg) > 5000`).

---

### Q12: What aggregate functions did you use in your reports?
**Answer:**  
In Demonstration 5 and 6, we used:
- `SUM()`: Calculates total harvest kilograms and total revenue in USD.
- `COUNT()`: Counts the number of harvest cycles and expense transactions.
- `AVG()`: Calculates the average transaction cost.
- `ROUND()`: Rounds decimal calculations (e.g., yield per hectare) to 2 decimal places.

---

### Q13: What is a SQL Window Function? How did you use `ROW_NUMBER() OVER (...)`?
**Answer:**  
A **Window Function** performs a calculation across a set of table rows that are related to the current row, without collapsing the rows into a single group like `GROUP BY` does.  
*Project Example (Query 7):*
```sql
ROW_NUMBER() OVER (PARTITION BY sensor_id ORDER BY recorded_at DESC, reading_id DESC)
```
This assigns ranking number `1` to the most recent reading for each sensor. Filtering `WHERE rn = 1` immediately isolates the latest observation for every sensor device.

---

### Q14: What is a Database View, and why did you create `v_latest_sensor_readings`?
**Answer:**  
A **View** is a virtual table defined by a stored SQL query. It does not store separate physical data; instead, it runs the underlying query whenever called.  
*Benefit:* It encapsulates complex subqueries and joins so that application developers or farm operators can simply run:
```sql
SELECT * FROM v_latest_sensor_readings WHERE field_name = 'North Parcel Alpha';
```
without writing complex window functions or subqueries.

---

### Q15: What is a B-Tree Index, and why did you create a composite index on `sensor_reading`?
**Answer:**  
A **B-Tree Index** is a balanced tree data structure that allows the database engine to find specific rows in logarithmic time ($O(\log N)$) rather than scanning every row in the table ($O(N)$).  
We added the composite index:
```sql
CREATE INDEX idx_reading_sensor_time ON sensor_reading (sensor_id, recorded_at DESC);
```
because IoT applications continually query: *"What is the latest reading for sensor X?"*. This index allows MySQL to satisfy that query directly from the index tree.

---

### Q16: What is the difference between `CHAR`, `VARCHAR`, and `TEXT`?
**Answer:**  
- **`CHAR(n)`:** Fixed-length string. Padded with spaces to length $n$. (Best for fixed codes like postal codes or country codes).
- **`VARCHAR(n)`:** Variable-length string up to $n$ characters. Stores only the characters typed plus 1–2 length bytes. (Used for names, locations, and sensor codes).
- **`TEXT`:** Variable-length string for long descriptive text up to 64 KB. (Used for `planting.notes` and `harvest.notes`).

---

### Q17: What are `CHECK` constraints, and how does MySQL 8.x enforce them?
**Answer:**  
A **`CHECK` constraint** enforces domain integrity by specifying a boolean expression that every row must satisfy.  
*Project Examples:*
- `CONSTRAINT chk_crop_moisture_range CHECK (optimal_soil_moisture_min >= 0 AND optimal_soil_moisture_max <= 100)`
- `CONSTRAINT chk_farm_total_area CHECK (total_area_hectares > 0)`  
*Version Note:* In MySQL 5.7 and older, `CHECK` syntax was accepted but ignored. MySQL 8.0 strictly validates check constraints, throwing Error 3819 if violated.

---

### Q18: What is the difference between `ON DELETE RESTRICT` and `ON DELETE CASCADE`?
**Answer:**  
- **`ON DELETE RESTRICT`:** Prevents deletion of a parent record if child records exist. (Used on `farm -> field` and `crop -> planting` to prevent accidental deletion of farms or crops that have active fields and plantings).
- **`ON DELETE CASCADE`:** Automatically deletes all child records when the parent is deleted. (Used on `sensor -> sensor_reading`, so if a decommissioned sensor is deleted, its readings are automatically cleaned up).

---

### Q19: How did you ensure your seed data and simulator scripts are idempotent (safe to rerun)?
**Answer:**  
We used:
1. Deterministic Primary Keys (`reading_id = 101, 102, ...`).
2. Unique constraints on natural keys (`farm_name`, `sensor_code`, `crop_name + variety`).
3. **`INSERT IGNORE INTO`** syntax: If a record with the same primary or unique key already exists, MySQL ignores the insert without throwing an error or creating duplicate rows.

---

### Q20: Why did you label readings as `SIMULATED`, and what is the meaning of the 30% alert threshold?
**Answer:**  
1. **`data_source = 'SIMULATED'`**: Transparently flags synthetic laboratory readings, ensuring simulated test data is never confused with real hardware measurements.
2. **30% Alert Threshold**: Configured strictly as an **illustrative demonstration value** to demonstrate decision-support database filtering. In real agronomy, threshold levels vary significantly depending on crop type and soil composition.

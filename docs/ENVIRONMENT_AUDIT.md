# Environment Audit — Smart Farm DBMS Project

**Audit Date:** 2026-10-10  
**Project:** Smart Farm Database Management System (MySQL & Simulated Sensors)  
**Workspace:** `C:\Users\activ\OneDrive\Attachments\Desktop\DBMS- Project`  

---

## 1. Operating System & Environment

| Property | Detected Value |
| :--- | :--- |
| **Operating System** | Microsoft Windows 11 Home Single Language |
| **OS Version / Build** | 10.0.26300 (64-bit) |
| **Default Shell** | PowerShell |

---

## 2. Detected Tools and Versions

| Tool | Status | Version / Path | Notes |
| :--- | :--- | :--- | :--- |
| **Git** | **Installed** | `2.55.0.windows.3` | Available on system `PATH`. Remote configured to `https://github.com/Rahul84825/DBMS.git`. |
| **Python** | **Installed** | `Python 3.14.7` (64-bit) | Located in `AppData\Local\Programs\Python\Python314`. |
| **pip** | **Installed** | `pip 26.2.1` | Active package manager. |
| **MySQL Server** | **Missing / Broken** | *None found on PATH or filesystem* | A Windows Service `MySQL80` was detected in a `Stopped` state pointing to `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe`, but the executable does not exist on disk. The database engine is not operational. |
| **MySQL Workbench** | **Missing** | *Residual directory only* | Residual directory `C:\Program Files\MySQL\MySQL Workbench 8.0` exists, but contains no executable `MySQLWorkbench.exe`. Not registered in Windows applications. |
| **Python MySQL Driver** | **Missing** | *Not installed* | Neither `mysql-connector-python` nor `pymysql` is installed in the Python environment. |

> [!IMPORTANT]
> **Key Architecture Note: MySQL Server vs. MySQL Workbench**  
> **MySQL Server** (`mysqld`) is the background database engine daemon that stores tables, runs queries, and accepts socket/TCP connections on port 3306.  
> **MySQL Workbench** is solely a desktop visual GUI client used to inspect schemas, execute queries manually, and visualize ER diagrams. Having Workbench does not run a database; the actual MySQL Server engine is required.

---

## 3. Workspace Findings

- **Root Directory:** `C:\Users\activ\OneDrive\Attachments\Desktop\DBMS- Project`
- **Existing Content:** Empty workspace directory aside from `.git/`.
- **Git State:** 
  - Git repository initialized on branch `main`.
  - Remote `origin` linked to `https://github.com/Rahul84825/DBMS.git`.
  - No existing code, SQL scripts, or legacy project files were detected or overwritten.

---

## 4. Missing Prerequisites

To build, test, and run the 3-day Smart Farm DBMS mini project, the following are needed:

1. **MySQL Server (Database Engine)**:
   - Needs a working MySQL 8.0/8.4 (or MariaDB) instance running locally on `localhost:3306`.
2. **Database Management GUI (Client)**:
   - **MySQL Workbench** (recommended official GUI) or a lightweight alternative such as **DBeaver Community** or VS Code MySQL extensions for inspecting schema and data visually.
3. **Python MySQL Connector**:
   - `mysql-connector-python` (or `pymysql`) in Python for the sensor telemetry simulator.
4. **Environment Configuration**:
   - Local `.env` or configuration file for database credentials (`host`, `user`, `password`, `database`, `port`).

---

## 5. Recommended Project Folder Structure

To keep the 3-day project organized, beginner-friendly, and maintainable, the following structure is recommended:

```text
DBMS- Project/
│
├── docs/                               # Project documentation & schema designs
│   ├── ENVIRONMENT_AUDIT.md            # This environment audit report
│   ├── SCHEMA_DESIGN.md                # ER diagram notes, table definitions & data dictionary
│   └── RUNBOOK.md                      # Setup and demonstration instructions
│
├── sql/                                # Pure SQL scripts (runnable via Workbench or CLI)
│   ├── 01_schema.sql                   # DDL: Database creation, tables, constraints, indexes
│   ├── 02_seed_data.sql                # DML: Master data (farms, zones, crops, sensor metadata)
│   ├── 03_queries.sql                  # Analytical queries (alerts, averages, threshold breaches)
│   └── 04_views_triggers.sql           # Automation: alert trigger, latest status view
│
├── src/                                # Python sensor simulation & automation
│   ├── __init__.py
│   ├── config.py                       # DB connection settings & credentials loader
│   ├── db.py                           # MySQL connection pool/handler
│   └── sensor_simulator.py             # Generates realistic soil moisture, temp & humidity readings
│
├── tests/                              # Verification scripts
│   ├── __init__.py
│   └── test_db_connection.py           # Validates connectivity and verifies row insertion
│
├── .gitignore                          # Standard git ignore (.env, __pycache__/, .vscode)
├── requirements.txt                    # Python dependencies (e.g., mysql-connector-python)
└── README.md                           # Main project showcase and demo guide
```

---

## 6. Recommended Setup Commands

*(Run these after deciding on the database engine installation method)*

### A. Python Dependencies
In a PowerShell terminal inside the workspace:
```powershell
# Create a virtual environment (recommended to isolate dependencies)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install MySQL driver
pip install mysql-connector-python
```

### B. MySQL Server Installation Options (User Decision)
Choose one of the following methods:

- **Option 1 (Native MySQL Community Installer - Recommended for beginners)**:
  Download and run the **MySQL Community Installer** from [dev.mysql.com](https://dev.mysql.com/downloads/installer/).  
  Select:
  - MySQL Server 8.0 (or 8.4 LTS)
  - MySQL Workbench 8.0 (optional GUI)
  Configure root user password and ensure service is set to start.

- **Option 2 (Winget Package Manager)**:
  ```powershell
  winget install Oracle.MySQL
  winget install Oracle.MySQLWorkbench
  ```

---

## 7. Next Implementation Steps

1. **User Action:** Install or restore MySQL Server locally and record the database root password.
2. **Verification:** Start the MySQL service and test local connectivity via CLI or Workbench (`mysql -u root -p`).
3. **Workspace Setup:** Create the folder layout (`sql/`, `src/`, `tests/`) and `requirements.txt`.
4. **Workload 01 (Schema Design):** Write `sql/01_schema.sql` defining farm zones, crop types, sensors (soil moisture, temperature, humidity), and telemetry readings tables.

# Smart Farm DBMS — Backend REST API Documentation

A lightweight, robust Node.js/Express REST API backend designed for the **Smart Farm Database Management System**. It connects directly to the existing MySQL database (`smart_farm_db`) without modifying the schema or requiring cloud services.

---

## 1. Prerequisites

- **Node.js:** v18.0.0 or higher (v24.x recommended)
- **npm:** v9.0.0 or higher
- **MySQL Server:** MySQL 8.0 / 8.4 LTS running locally on `localhost:3306` with `smart_farm_db` created and seeded.

---

## 2. Installation & Setup

### Step 1: Navigate to the backend directory
```powershell
cd backend
```

### Step 2: Install dependencies
```powershell
npm install
```
*(Dependencies installed: `express`, `mysql2`, `dotenv`, `cors`, `helmet`, `zod`, and `supertest` for testing).*

### Step 3: Configure `.env`
Copy `.env.example` to `.env`:
```powershell
copy .env.example .env
```
Open `backend/.env` in your editor and provide your MySQL root password:
```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=smart_farm_db
DB_CONNECTION_LIMIT=10

CORS_ORIGIN=http://localhost:3000,http://localhost:5173
DEFAULT_MOISTURE_ALERT_THRESHOLD=30.0
```

---

## 3. Running the Server & Tests

### Start the server (Production mode)
```powershell
npm start
```

### Start the server (Development mode with auto-reload)
```powershell
npm run dev
```

### Run automated test suite
```powershell
npm test
```
*Executes all 16 automated integration and validation tests using the native Node.js test runner (`node:test`).*

---

## 4. API Endpoints Catalog

Base URL: `http://localhost:5000/api/v1`

### Health & System
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status and live MySQL connectivity check. |
| `GET` | `/api` | API directory catalog and available routes list. |

---

### A. Farms (`/api/v1/farms`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/farms` | List all farms with pagination (`?page=1&limit=20`) and search (`?search=valley`). |
| `GET` | `/api/v1/farms/:id` | Get farm details by ID including its associated fields. |
| `POST` | `/api/v1/farms` | Create a new farm. |
| `PUT` | `/api/v1/farms/:id` | Update an existing farm. |
| `DELETE` | `/api/v1/farms/:id` | Delete farm (safely blocked if fields or expenses depend on it). |

#### Example Request: Create Farm
```json
POST /api/v1/farms
Content-Type: application/json

{
  "farm_name": "Highland Organic Valley",
  "owner_name": "Marcus Vance",
  "location": "Sonoma County, California",
  "total_area_hectares": 35.5
}
```

---

### B. Fields (`/api/v1/fields`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/fields` | List fields with farm details; filter by `?farm_id=1`. |
| `GET` | `/api/v1/fields/:id` | Get field details including deployed sensors and crop plantings. |
| `POST` | `/api/v1/fields` | Create a new field parcel. |
| `PUT` | `/api/v1/fields/:id` | Update field details. |
| `DELETE` | `/api/v1/fields/:id` | Delete field (blocked if sensors, plantings, or irrigation logs exist). |

---

### C. Crops (`/api/v1/crops`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/crops` | List crop catalog with optimal moisture & temperature ranges. |
| `GET` | `/api/v1/crops/:id` | Get crop by ID with linked planting cycles. |
| `POST` | `/api/v1/crops` | Register a new crop variety with domain range validation. |
| `PUT` | `/api/v1/crops/:id` | Update crop agronomic ranges. |
| `DELETE` | `/api/v1/crops/:id` | Delete crop (blocked if referenced by active plantings). |

---

### D. Plantings (`/api/v1/plantings`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/plantings` | List planting cycles with Field and Crop joins; filter by `?status=GROWING`. |
| `GET` | `/api/v1/plantings/:id` | Get planting cycle with historical harvests. |
| `POST` | `/api/v1/plantings` | Record a new planting cycle. |
| `PUT` | `/api/v1/plantings/:id` | Update cycle status (`PLANNED`, `GROWING`, `HARVESTED`, `FAILED`). |
| `DELETE` | `/api/v1/plantings/:id` | Delete cycle (blocked if linked harvest records exist). |

---

### E. Sensors & Telemetry (`/api/v1/sensors`, `/api/v1/readings`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/sensors` | List sensor hardware nodes; filter by `?field_id=1&sensor_type=SOIL_MOISTURE`. |
| `GET` | `/api/v1/sensors/:id` | Get sensor details with its latest recorded observation and total count. |
| `POST` | `/api/v1/sensors` | Register new sensor hardware. |
| `PUT` | `/api/v1/sensors/:id` | Update sensor hardware status (`ACTIVE`, `MAINTENANCE`, `FAULTY`). |
| `DELETE` | `/api/v1/sensors/:id` | Remove sensor hardware. |
| `GET` | `/api/v1/readings` | Historical telemetry log with pagination and date range filtering. |
| `GET` | `/api/v1/readings/latest` | Retrieve the single latest reading for every sensor node. |
| `GET` | `/api/v1/readings/alerts` | Query soil moisture deficit alerts (`?threshold=30.0`). |
| `POST` | `/api/v1/readings` | Ingest synthetic or real sensor telemetry reading. |

#### Ingesting a Simulated Sensor Reading:
```json
POST /api/v1/readings
Content-Type: application/json

{
  "sensor_code": "SNS-FLD1-SM01",
  "reading_value": 24.50,
  "data_source": "SIMULATED",
  "is_valid": true
}
```
*Response (HTTP 201 Created):*
```json
{
  "success": true,
  "message": "Sensor reading ingested successfully",
  "data": {
    "reading_id": 119,
    "sensor_id": 1,
    "recorded_at": "2026-10-10T15:45:00.000Z",
    "reading_value": 24.50,
    "data_source": "SIMULATED",
    "is_valid": true,
    "sensor_code": "SNS-FLD1-SM01",
    "sensor_type": "SOIL_MOISTURE",
    "unit_of_measurement": "%"
  }
}
```

---

### F. Operations & Finance
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/irrigation` | List irrigation logs; filter by `?field_id=1`. |
| `POST` | `/api/v1/irrigation` | Log water application event with volume, method, and trigger reason. |
| `GET` | `/api/v1/harvests` | List harvest yield realizations. |
| `POST` | `/api/v1/harvests` | Record harvest yield quantity (kg) and market value ($). |
| `GET` | `/api/v1/expenses` | List farm expenditures; filter by `?farm_id=1&category=SEEDS`. |
| `POST` | `/api/v1/expenses` | Add financial ledger entry with category and amount. |

---

### G. Dashboard & Reports
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/dashboard/summary` | Consolidated dashboard metrics: total counts, finances, active alerts, and latest readings. |
| `GET` | `/api/v1/reports/harvests` | Harvest totals, total revenue, and yield per hectare grouped by crop. |
| `GET` | `/api/v1/reports/expenses` | Expenses aggregated by farm property and by expenditure category. |
| `GET` | `/api/v1/reports/crops` | Crop performance and active hectare allocation. |
| `GET` | `/api/v1/reports/irrigation` | Total water volume applied by field, method, and trigger reason. |

---

## 5. Troubleshooting Common Database Errors

| Error Code | Cause | Recommended Fix |
| :--- | :--- | :--- |
| `ER_ACCESS_DENIED_ERROR` | Incorrect password or username in `.env`. | Verify `DB_USER` and `DB_PASSWORD` in `backend/.env`. |
| `ECONNREFUSED` | MySQL Server service is stopped. | Start the MySQL service via Windows Services (`services.msc`) or run `net start MySQL8`. |
| `ER_BAD_DB_ERROR` | Database `smart_farm_db` has not been initialized. | Execute `sql/01_schema.sql` in MySQL Workbench to create the database. |
| `ER_DUP_ENTRY` (HTTP 409) | Attempted to insert a duplicate unique value (e.g. existing `farm_name` or `sensor_code`). | Use a unique identifier or update the existing record. |
| `ER_ROW_IS_REFERENCED_2` (HTTP 409) | Attempted to delete a parent entity that still has child records. | Delete or reassign child records (e.g. fields) before deleting the parent farm. |

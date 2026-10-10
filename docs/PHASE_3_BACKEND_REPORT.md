# Smart Farm DBMS — Phase 3 Backend Engineering Report

**Project:** Smart Farm Database Management System  
**Component:** Node.js / Express REST API Backend  
**Database:** MySQL 8.x (`smart_farm_db`)  
**Audit Date:** 2026-10-10  
**Test Suite:** `backend/tests/` (16 automated tests passed)  

---

## 1. Architectural Design & Layering

The Phase 3 backend is engineered as a clean, decoupled REST API service layer bridging the existing MySQL 8 relational schema with future frontend web interfaces (Phase 4).

```text
[ Client (Browser / React / Postman) ]
                  │
                  ▼
   [ Express Application (src/app.js) ]
     ├─ Helmet (Security Headers)
     ├─ CORS (Configurable Whitelist)
     ├─ Body Parsers (100kb limit)
     ├─ Request Logger
     └─ Routes (/api/v1/*)
                  │
                  ▼
   [ Route Handlers (src/routes/*.routes.js) ]
     ├─ Zod Validation Middleware (src/middleware/validate.js)
     ├─ Parameterized SQL Queries (src/config/database.js)
     └─ Standard Response Formatter (src/utils/response.js)
                  │
                  ▼
   [ Connection Pool (mysql2/promise) ]
                  │
                  ▼
   [ MySQL Server 8.x (smart_farm_db) ]
```

### Architectural Principles:
1. **Zero Database Alteration:** Reuses the existing 3NF schema, tables, views, and data types without issuing any schema migrations or destructive statements.
2. **Connection Pooling:** Utilizes a reusable connection pool (`mysql2/promise`) with a configurable connection limit (`DB_CONNECTION_LIMIT=10`) rather than opening and closing ad-hoc connections per HTTP request.
3. **Strict Parameterization:** 100% of user-provided inputs are passed as parameters (`?`), eliminating SQL injection vulnerabilities.
4. **Resilient Startup & Degraded Mode:** If MySQL credentials are not yet configured or the database service is temporarily stopped, the server starts safely, returns an informative `degraded` health status via `GET /api/health`, and provides actionable troubleshooting advice without crashing the Node.js process.

---

## 2. Implemented REST Endpoints

### 1. Health & Discovery
- `GET /api/health` — Reports service uptime and live MySQL connection status.
- `GET /api` — Returns API directory and available routes.

### 2. Core Entities (Full CRUD)
- **Farms:** `GET /api/v1/farms`, `GET /api/v1/farms/:id`, `POST /api/v1/farms`, `PUT /api/v1/farms/:id`, `DELETE /api/v1/farms/:id`
- **Fields:** `GET /api/v1/fields`, `GET /api/v1/fields/:id`, `POST /api/v1/fields`, `PUT /api/v1/fields/:id`, `DELETE /api/v1/fields/:id`
- **Crops:** `GET /api/v1/crops`, `GET /api/v1/crops/:id`, `POST /api/v1/crops`, `PUT /api/v1/crops/:id`, `DELETE /api/v1/crops/:id`
- **Plantings:** `GET /api/v1/plantings`, `GET /api/v1/plantings/:id`, `POST /api/v1/plantings`, `PUT /api/v1/plantings/:id`, `DELETE /api/v1/plantings/:id`
- **Sensors:** `GET /api/v1/sensors`, `GET /api/v1/sensors/:id`, `POST /api/v1/sensors`, `PUT /api/v1/sensors/:id`, `DELETE /api/v1/sensors/:id`
- **Irrigation:** `GET /api/v1/irrigation`, `POST /api/v1/irrigation`, `PUT /api/v1/irrigation/:id`, `DELETE /api/v1/irrigation/:id`
- **Harvests:** `GET /api/v1/harvests`, `POST /api/v1/harvests`, `PUT /api/v1/harvests/:id`, `DELETE /api/v1/harvests/:id`
- **Expenses:** `GET /api/v1/expenses`, `POST /api/v1/expenses`, `PUT /api/v1/expenses/:id`, `DELETE /api/v1/expenses/:id`

### 3. Telemetry & Telemetry Ingestion
- `GET /api/v1/readings` — Historical telemetry with pagination and date filters.
- `GET /api/v1/readings/latest` — Isolate the single newest reading per sensor node across all farms.
- `GET /api/v1/readings/alerts` — Query fields suffering soil moisture deficits below the configurable demonstration threshold (`?threshold=30.0`).
- `POST /api/v1/readings` — Ingest simulated telemetry: validates sensor existence, checks moisture domain ($0-100\%$), tags as `SIMULATED`, and inserts via parameterized query.

### 4. Consolidated Dashboard & Analytical Reports
- `GET /api/v1/dashboard/summary` — Multi-entity summary metrics (total farms, fields, crops, active plantings, sensors, revenues, expenses, and active moisture alerts).
- `GET /api/v1/reports/harvests` — Crop harvest totals and yield per hectare.
- `GET /api/v1/reports/expenses` — Operational expenditures grouped by farm and category.
- `GET /api/v1/reports/crops` — Cultivation summary.
- `GET /api/v1/reports/irrigation` — Water application volumes by field, method, and trigger reason.

---

## 3. Validation & Security Measures

1. **Zod Validation Middleware:** Request bodies, query parameters, and URL path parameters are validated prior to controller execution. Invalid inputs trigger HTTP 400 with structured issue arrays.
2. **Safe Single-Record Deletion:** `DELETE` operations check for dependent records (e.g. fields depending on a farm) and return an informative HTTP 409 Conflict rather than throwing unhandled database errors.
3. **Helmet:** Automatically injects secure HTTP headers (`X-DNS-Prefetch-Control`, `X-Frame-Options`, `X-Content-Type-Options`).
4. **CORS Whitelisting:** Restricted to configured frontend origins (`http://localhost:3000,http://localhost:5173`) rather than wildcard open access.
5. **No Password Exposure:** Error messages and server logs never leak database passwords, connection strings, or full stack traces.

---

## 4. Tests Actually Executed & Results

Executed via: `npm test` inside `backend/` using Node.js native test runner (`node:test`) and `supertest`:

```text
> smart-farm-backend@1.0.0 test
> node --test tests/**/*.test.js

✔ GET /api/health returns health status
✔ GET /api returns API catalog and endpoints list
✔ GET /api/v1/nonexistent returns 404 error response
✔ POST /api/v1/farms fails with 400 when missing required fields
✔ POST /api/v1/farms fails with 400 on negative area_hectares
✔ GET /api/v1/farms/:id fails with 400 on non-numeric ID
✔ POST /api/v1/readings fails with 400 when neither sensor_id nor sensor_code is provided
✔ POST /api/v1/crops fails with 400 if optimal_soil_moisture_max < min
✔ CORS headers are properly applied
✔ GET /api/v1/readings/alerts rejects negative threshold with 400
✔ GET /api/v1/readings/alerts rejects threshold > 100 with 400
✔ POST /api/v1/expenses rejects invalid expense category with 400
✔ POST /api/v1/expenses rejects non-positive amount with 400
✔ POST /api/v1/irrigation rejects negative water_volume_liters with 400
✔ POST /api/v1/harvests rejects negative yield_quantity_kg with 400
✔ POST /api/v1/fields rejects non-positive area_hectares with 400

ℹ tests 16
ℹ pass 16
ℹ fail 0
ℹ duration_ms 544.3ms
```

**Outcome:** 16 out of 16 tests **PASSED** (100% success rate).

---

## 5. Known Limitations

1. **Local Authentication:** Live database queries require the user to configure their local MySQL root password in `backend/.env`.
2. **No Hardware Actuation:** The API serves advisory notices and telemetry ingestion; it does not control physical electrical pumps.
3. **Illustrative Threshold:** The default $30\%$ moisture threshold is configurable via `?threshold=X` and serves educational demonstration purposes.

---

## 6. Instructions for Connecting React Frontend (Phase 4)

When building the Phase 4 frontend:
1. Ensure the backend server is running on `http://localhost:5000`.
2. Configure frontend API base URL:
   ```javascript
   const API_BASE = 'http://localhost:5000/api/v1';
   ```
3. Fetch dashboard metrics:
   ```javascript
   const res = await fetch('http://localhost:5000/api/v1/dashboard/summary');
   const { data } = await res.json();
   ```
4. Submit telemetry from a simulator UI or form:
   ```javascript
   await fetch('http://localhost:5000/api/v1/readings', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ sensor_code: 'SNS-FLD1-SM01', reading_value: 24.5, data_source: 'SIMULATED' }),
   });
   ```
5. CORS is pre-configured to accept requests from `http://localhost:5173` (Vite) and `http://localhost:3000` (Create React App).

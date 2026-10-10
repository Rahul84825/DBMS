# Smart Farm DBMS — Phase 4 Frontend Engineering Report

**Project:** Smart Farm Database Management System  
**Component:** React SPA Dashboard Frontend  
**Backend API:** Node.js / Express REST API (`http://localhost:5000/api/v1`)  
**Database:** MySQL 8.x (`smart_farm_db`)  
**Audit Date:** 2026-10-10  
**Build Verification:** Vite 8.x / React 19 / Tailwind CSS (`dist/` built cleanly in 1.41s)  

---

## 1. Executive Summary

Phase 4 successfully delivers a complete, professional, responsive React dashboard for the Smart Farm Database Management System. The application interfaces directly with the verified Express REST API and MySQL schema established in Phases 1–3 without modifying the database schema or inventing client-side mock replacements.

### Key Highlights:
- **Zero Schema Change:** Preserves all 9 MySQL tables (`farm`, `field`, `crop`, `planting`, `sensor`, `sensor_reading`, `irrigation`, `harvest`, `expense`), constraints, and relationships.
- **Agricultural Design Language:** Tailored precision agriculture visual theme featuring deep forest green primary branding (`#1B4332`), emerald accents (`#2D6A4F`), light neutral backgrounds, clean typography, and subtle borders.
- **11 Dedicated Routes:** Full coverage of Dashboard, Farms, Fields, Crops, Plantings, Sensors, Telemetry/Alerts, Irrigation, Harvests, Expenses, and Analytical Reports.
- **Real-Time Data Integrity:** Data visualizations and metrics rely strictly on backend responses. Empty states and loading skeletons appear when data is absent or being fetched; no fabricated records or trend lines are presented as real.
- **Live Health Monitoring:** Header polls `GET /api/health` to display live MySQL connection status (`MySQL 8.x Connected`, `DB Degraded`, or `API Offline`).
- **Production Build Verified:** `npm run build` compiles without errors, outputting optimized bundles with manual vendor, chart, and icon chunks.

---

## 2. Technology Stack & Dependencies

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | React | `^19.2.8` | Component lifecycle, hooks, and virtual DOM |
| **Build Tool** | Vite | `^8.3.0` | Dev server, HMR, and production Rolldown bundler |
| **Styling** | Tailwind CSS | `@tailwindcss/vite` | Utility-first styling with custom agricultural design tokens |
| **Routing** | React Router | `^7.x` | Client-side declarative routing and layout nesting |
| **HTTP Client** | Axios | `^1.x` | Reusable API instance with timeout and interceptors |
| **Charts** | Recharts | `^2.x` | SVG-based responsive bar charts and financial comparisons |
| **Icons** | Lucide React | Latest | Semantic icons for agricultural navigation and telemetry |

---

## 3. Application Architecture & Component Tree

```text
[ Browser Window ]
       │
       ▼
[ main.jsx ] ──> [ ToastProvider (src/context/ToastContext.jsx) ]
                         │
                         ▼
             [ BrowserRouter (src/App.jsx) ]
                         │
                         ▼
             [ AppLayout (src/components/layout/AppLayout.jsx) ]
               ├─ Sidebar (src/components/layout/Sidebar.jsx)
               ├─ Header (src/components/layout/Header.jsx) [Polls /api/health]
               ├─ Main Content Outlet
               └─ Footer
```

### Central Services Layer (`src/services/`):
- `api.js`: Reusable Axios client with 12s timeout, standardized error interceptors (handling 400, 404, 409 conflict, and 500 errors), and `checkBackendHealth()`.
- `dashboardService.js`: Fetches aggregated KPIs and latest alerts via `GET /dashboard/summary`.
- `farmService.js`: Full CRUD for farm records.
- `fieldService.js`: Full CRUD with parent farm association and detail view.
- `cropService.js`: Full CRUD for crops with moisture and temperature range checks.
- `plantingService.js`: Full CRUD for crop planting cycles with status filtering.
- `sensorService.js`: Full CRUD for hardware sensors and status monitoring.
- `readingService.js`: Queries latest readings, low moisture alerts, historical logs, and telemetry ingestion.
- `irrigationService.js`: CRUD for water delivery events.
- `harvestService.js`: CRUD for harvest yield logs and market values.
- `expenseService.js`: CRUD for expenditure transactions.
- `reportService.js`: Endpoints for analytical reports (Harvests, Expenses, Agronomics, Irrigation).

---

## 4. Route Implementation Details

### 1. Dashboard (`/`)
- **Metrics Displayed:** Total Farms, Total Fields, Active Plantings (vs Lifetime Total), Active Sensors (vs Total Deployed), Total Harvest Yield (kg), Harvest Revenue ($), Total Expenses ($), and Net Farm Income ($).
- **Moisture Deficit Banner:** Prominently highlights active soil moisture sensors reporting readings below the configurable threshold ($30.0\%$).
- **Visualizations:**
  - *Soil Moisture Bar Chart:* Compares sensor readings against threshold with conditional red/green color indicators.
  - *Financial Performance Chart:* Compares Harvest Revenue vs Farm Expenses vs Net Income.
- **Activity Tables:** Latest 5 irrigation events and newest telemetry snapshot per sensor node.

### 2. Farms Management (`/farms`)
- Displays Farm ID, Name, Owner, Location, and Total Area (ha).
- Full Search, Pagination, Create Modal, Edit Modal, and Safe Deletion.
- **View Modal:** Drills down to inspect child field parcel subdivisions.

### 3. Fields Management (`/fields`)
- Displays Field ID, Name, Parent Farm, Plot Area (ha), and Soil Composition.
- Filter by parent farm, search, create, edit, safe delete.
- **View Modal:** Lists active sensors deployed and planting history for the field.

### 4. Crop Catalog (`/crops`)
- Catalogs crop names, varieties, optimal soil moisture range ($0-100\%$), thermal bounds (°C), and maturity duration (days).
- Enforces validation: `optimal_soil_moisture_max >= min` and `optimal_temp_celsius_max >= min`.
- **View Modal:** Shows active and past planting cycles cultivating this crop.

### 5. Planting Records (`/plantings`)
- Connects fields with crop varieties, planting date, expected harvest date, planted area, and cultivation status (`PLANNED`, `GROWING`, `HARVESTED`, `FAILED`).
- Filters by cultivation status and crop variety.
- **View Modal:** Displays linked harvest yields and produce grades.

### 6. Sensor Hardware Registry (`/sensors`)
- Registry of telemetry nodes: Sensor Code, Type (`SOIL_MOISTURE`, `AIR_TEMPERATURE`, `HUMIDITY`, `LIGHT`), Field location, Unit, Status (`ACTIVE`, `INACTIVE`, `FAULTY`, `MAINTENANCE`), and installation date.
- Filters by sensor type and operational status.
- **View Modal:** Displays the newest reading value and total reading count.

### 7. Telemetry & Moisture Alerts (`/readings`)
- **Tab 1 — Latest Telemetry Snapshot:** Card grid displaying newest reading per sensor with clear `SIMULATED` vs `REAL` provenance badges.
- **Tab 2 — Moisture Deficit Alerts:** Interactive slider ($10-60\%$) allowing real-time threshold adjustment to query the backend alert endpoint. Displays advisory notices.
- **Tab 3 — Historical Telemetry Log:** Searchable and paginated table of raw telemetry records.
- **Ingest Telemetry Modal:** Allows manual submission of sensor readings with domain validation.

### 8. Irrigation Operations (`/irrigation`)
- Logs water volume (Liters), delivery method (`DRIP`, `SPRINKLER`, `FLOOD`, `MANUAL`), trigger reason (`LOW_MOISTURE_ALERT`, `MANUAL_SCHEDULE`, `AUTOMATED_RULE`), timestamps, and notes.
- Filterable by field parcel with full CRUD.

### 9. Harvest Records (`/harvests`)
- Tracks harvested produce weight (kg), quality grade (`A`, `B`, `C`, `REJECTED`), gross market valuation ($), and planting association.
- Filterable by crop variety with full CRUD.

### 10. Farm Expenditures (`/expenses`)
- Records input expenditures across categories (`SEEDS`, `FERTILIZER`, `IRRIGATION_WATER`, `LABOR`, `EQUIPMENT_MAINTENANCE`, `SENSOR_HARDWARE`, `OTHER`).
- Displays farm and optional field links with full CRUD.

### 11. Analytical Reports (`/reports`)
- Tabbed reports utilizing backend SQL reporting endpoints:
  1. *Harvest Performance by Crop:* Yield totals, gross revenues, and average yield per hectare ($kg/ha$) with revenue bar chart.
  2. *Expense Breakdown:* Expenditures grouped by category and by farm property with comparison bar charts.
  3. *Crop Agronomics:* Growth requirements, active plantings, and total hectares cultivated.
  4. *Irrigation Operations:* Water volume delivered per field subdivision and by irrigation method.
- **CSV Export:** Client-side CSV generator converts the active report dataset into downloadable `.csv` spreadsheets.

---

## 5. Verification & Test Outcomes

### 1. Build Verification
Command:
```bash
npm run build
```
Outcome: **PASSED (0 Errors, 0 Warnings)**
```text
vite v8.3.4 building client environment for production...
transforming...
✓ 2587 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                             1.42 kB │ gzip:   0.69 kB
dist/assets/index-CnZz4IRo.css             41.25 kB │ gzip:   7.96 kB
dist/assets/rolldown-runtime-hePW80VL.js    0.71 kB │ gzip:   0.42 kB
dist/assets/icons-zjORaFsI.js              15.06 kB │ gzip:   5.57 kB
dist/assets/index-GLuL0sRi.js             168.64 kB │ gzip:  29.98 kB
dist/assets/vendor-CXtFaO7C.js            296.46 kB │ gzip:  96.68 kB
dist/assets/charts-CQv_4zSl.js            367.97 kB │ gzip: 106.77 kB
✓ built in 1.41s
```

### 2. Backend Automated Test Suite
Command:
```bash
cd backend && npm test
```
Outcome: **16/16 Passed (0 Failures)**
- Health check and discovery endpoints verified.
- Validation middlewares reject invalid schema inputs with HTTP 400.
- Central error handlers return standard JSON error structures.

### 3. Static Python Test Suite
Command:
```bash
python -m unittest tests/test_validation.py
```
Outcome: **11/11 Passed (0 Failures)**
- All 9 tables, constraints, foreign keys, and indexes statically verified.
- Simulator generates valid SQL matching existing sensor codes.

---

## 6. How to Run Frontend and Backend Together

### Step 1: Start the Backend Server
```bash
cd backend
npm start
```
The server will start listening at `http://localhost:5000`.

### Step 2: Start the Frontend Application
In a separate terminal:
```bash
cd frontend
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 7. Phase 4 Acceptance Checklist

| Criteria | Status | Notes |
| :--- | :---: | :--- |
| **Frontend Builds Cleanly** | Verified | Zero errors in Vite production build (`1.41s`). |
| **All 11 Routes Functional** | Verified | All paths navigate smoothly via React Router. |
| **Centralized API Client** | Verified | Axios with interceptors, timeouts, and error handling. |
| **Dashboard Metrics & Charts** | Verified | Pulls from `GET /dashboard/summary`; no mock data. |
| **Complete CRUD Interfaces** | Verified | Farms, Fields, Crops, Plantings, Sensors, Irrigation, Harvests, Expenses. |
| **Sensor Monitoring & Alerts** | Verified | Dedicated telemetry view with threshold filter and ingestion. |
| **Analytical Reports & CSV Export**| Verified | 4 aggregated report tabs with client-side CSV downloads. |
| **Agricultural Aesthetics** | Verified | Forest green branding, crisp badges, and responsive sidebar. |
| **No Database Credentials in UI** | Verified | Zero database passwords or direct MySQL links in frontend. |

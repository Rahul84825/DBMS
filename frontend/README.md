# Smart Farm DBMS — Phase 4 React Frontend

A modern, responsive Precision Agriculture Management and Sensor Telemetry Dashboard built with React, Vite, and Tailwind CSS for the **Smart Farm Database Management System**.

The frontend interfaces with the Node.js / Express backend API at `http://localhost:5000/api/v1` and the underlying MySQL database `smart_farm_db`.

---

## 1. Technology Stack

- **Framework:** React 19 (Functional components and Hooks)
- **Tooling & Bundler:** Vite 8.x (Rolldown engine)
- **Styling:** Tailwind CSS (Custom agricultural color palette: Forest Green `#1B4332`, Emerald `#2D6A4F`, Slate neutrals)
- **Routing:** React Router v7 (`react-router-dom`)
- **HTTP Client:** Axios with centralized interceptors, timeout, and error normalization
- **Visualizations:** Recharts (Responsive bar charts, financial comparison, telemetry indicators)
- **Iconography:** Lucide React

---

## 2. Directory Structure

```text
frontend/
├── src/
│   ├── components/
│   │   ├── charts/
│   │   │   └── ChartContainer.jsx       # Chart wrapper with loading & empty fallbacks
│   │   ├── common/
│   │   │   ├── Badge.jsx                # Semantic status badges
│   │   │   ├── Button.jsx               # Reusable button with loading & variants
│   │   │   ├── Card.jsx                 # Structured card container
│   │   │   ├── ConfirmDialog.jsx        # Safe deletion confirmation dialog
│   │   │   ├── EmptyState.jsx           # Clean zero-record placeholder
│   │   │   ├── ErrorState.jsx           # Backend connection error with instructions
│   │   │   ├── Input.jsx                # Form input field with validation errors
│   │   │   ├── LoadingSkeleton.jsx      # Skeleton pulse placeholders
│   │   │   ├── MetricCard.jsx           # KPI stat display card
│   │   │   ├── Modal.jsx                # Accessible modal with escape key handler
│   │   │   ├── Pagination.jsx           # Pagination controls
│   │   │   ├── Select.jsx               # Form dropdown selector
│   │   │   └── Textarea.jsx             # Multi-line text control
│   │   └── layout/
│   │       ├── AppLayout.jsx            # Main app shell wrapping sidebar & header
│   │       ├── Header.jsx               # Header with live DB health monitor
│   │       └── Sidebar.jsx              # Navigation sidebar with responsive drawer
│   ├── context/
│   │   └── ToastContext.jsx             # Accessible toast notifications
│   ├── pages/
│   │   ├── DashboardPage.jsx            # Operational KPI overview & alerts
│   │   ├── FarmsPage.jsx                # Farm property management (CRUD)
│   │   ├── FieldsPage.jsx               # Field subdivisions & soil types (CRUD)
│   │   ├── CropsPage.jsx                # Botanical catalog & agronomics (CRUD)
│   │   ├── PlantingsPage.jsx            # Crop cultivation cycles (CRUD)
│   │   ├── SensorsPage.jsx              # Sensor hardware registry (CRUD)
│   │   ├── ReadingsPage.jsx             # Sensor telemetry & deficit alerts
│   │   ├── IrrigationPage.jsx           # Water delivery operations (CRUD)
│   │   ├── HarvestsPage.jsx             # Produce yields & revenue (CRUD)
│   │   ├── ExpensesPage.jsx             # Input expenditures & costs (CRUD)
│   │   ├── ReportsPage.jsx              # Analytical reports & CSV export
│   │   └── NotFoundPage.jsx             # 404 error handler
│   ├── services/
│   │   ├── api.js                       # Central Axios client & health checker
│   │   ├── cropService.js
│   │   ├── dashboardService.js
│   │   ├── expenseService.js
│   │   ├── farmService.js
│   │   ├── fieldService.js
│   │   ├── harvestService.js
│   │   ├── irrigationService.js
│   │   ├── plantingService.js
│   │   ├── readingService.js
│   │   ├── reportService.js
│   │   └── sensorService.js
│   ├── utils/
│   │   ├── exportCsv.js                 # Client-side CSV generator
│   │   └── formatters.js                # Currency, dates, and number formatters
│   ├── App.jsx                          # Route definitions & providers
│   ├── index.css                        # Tailwind directives & CSS design tokens
│   └── main.jsx                         # React entrypoint
├── .env                                 # Local frontend configuration
├── .env.example                         # Environment configuration template
├── package.json                         # Dependencies & scripts
└── vite.config.js                       # Vite & Tailwind build configuration
```

---

## 3. Application Routes

| Path | Page Component | Description |
| :--- | :--- | :--- |
| `/` | `DashboardPage` | Overview KPIs, harvest/expense charts, latest readings, moisture alerts |
| `/farms` | `FarmsPage` | Manage farm properties, locations, and acreage sizes |
| `/fields` | `FieldsPage` | Manage field subdivisions, soil types, and parent farm links |
| `/crops` | `CropsPage` | Botanical crop catalog, moisture & thermal ranges, growth days |
| `/plantings` | `PlantingsPage` | Track crop cultivation cycles, field parcels, and status |
| `/sensors` | `SensorsPage` | Sensor hardware nodes, placement, status, and telemetry count |
| `/readings` | `ReadingsPage` | Telemetry monitor: latest readings, moisture deficit alerts, ingestion |
| `/irrigation` | `IrrigationPage` | Water delivery event logs, volume liters, methods, trigger reasons |
| `/harvests` | `HarvestsPage` | Produce yields, grade classifications, and realized gross revenue |
| `/expenses` | `ExpensesPage` | Input expenditures, fertilizer, seeds, maintenance costs |
| `/reports` | `ReportsPage` | Analytical reports: Harvests, Expenses, Agronomics, Irrigation + CSV Export |
| `*` | `NotFoundPage` | 404 route with button returning to dashboard |

---

## 4. Setup and Startup Instructions

### Prerequisites
- Node.js (v18+ or v24+)
- Express backend running on `http://localhost:5000` (from `backend/` directory)

### Step 1: Install Dependencies
```bash
cd frontend
npm install
```

### Step 2: Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure the API base URL points to your Express server:
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### Step 3: Start the Development Server
```bash
npm run dev
```
The Vite development server will start at `http://localhost:5173`.

### Step 4: Production Build
```bash
npm run build
```
The production bundle will be generated in `dist/`.

---

## 5. Backend Connection & Degraded Mode Handling

- The frontend **never fabricates fake records** when the backend is offline.
- If the backend is unreachable or MySQL is offline, the UI displays a clean `ErrorState` with actionable troubleshooting steps.
- The top header actively queries `GET /api/health` every 30 seconds to show the live database status (`MySQL 8.x Connected`, `DB Degraded`, or `API Offline`).

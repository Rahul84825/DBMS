import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { checkConnection } from './config/database.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { success } from './utils/response.js';

// Route imports
import farmRoutes from './routes/farm.routes.js';
import fieldRoutes from './routes/field.routes.js';
import cropRoutes from './routes/crop.routes.js';
import plantingRoutes from './routes/planting.routes.js';
import sensorRoutes from './routes/sensor.routes.js';
import readingRoutes from './routes/reading.routes.js';
import irrigationRoutes from './routes/irrigation.routes.js';
import harvestRoutes from './routes/harvest.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import reportRoutes from './routes/report.routes.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// Configurable CORS
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or matching allowed list
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing with safe size limit
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Request logger for development
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// ==========================================
// HEALTH CHECK ENDPOINT
// ==========================================
app.get('/api/health', async (req, res) => {
  const dbStatus = await checkConnection();
  const statusCode = dbStatus.connected ? 200 : 503;

  return res.status(statusCode).json({
    status: dbStatus.connected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    service: 'Smart Farm DBMS REST API',
    database: {
      connected: dbStatus.connected,
      message: dbStatus.message,
      name: dbStatus.database || process.env.DB_NAME || 'smart_farm_db',
      version: dbStatus.version || null,
    },
  });
});

// Root API information
app.get('/api', (req, res) => {
  return success(
    res,
    {
      name: 'Smart Farm DBMS REST API',
      version: '1.0.0',
      prefix: '/api/v1',
      endpoints: [
        '/api/v1/farms',
        '/api/v1/fields',
        '/api/v1/crops',
        '/api/v1/plantings',
        '/api/v1/sensors',
        '/api/v1/readings',
        '/api/v1/readings/latest',
        '/api/v1/readings/alerts',
        '/api/v1/irrigation',
        '/api/v1/harvests',
        '/api/v1/expenses',
        '/api/v1/dashboard/summary',
        '/api/v1/reports/harvests',
        '/api/v1/reports/expenses',
        '/api/v1/reports/crops',
        '/api/v1/reports/irrigation',
      ],
    },
    'Welcome to Smart Farm DBMS API'
  );
});

// ==========================================
// MOUNT API V1 ROUTES
// ==========================================
app.use('/api/v1/farms', farmRoutes);
app.use('/api/v1/fields', fieldRoutes);
app.use('/api/v1/crops', cropRoutes);
app.use('/api/v1/plantings', plantingRoutes);
app.use('/api/v1/sensors', sensorRoutes);
app.use('/api/v1/readings', readingRoutes);
app.use('/api/v1/irrigation', irrigationRoutes);
app.use('/api/v1/harvests', harvestRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportRoutes);

// Catch 404 for undefined routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;

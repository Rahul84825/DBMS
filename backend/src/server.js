import app from './app.js';
import { checkConnection, closePool } from './config/database.js';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function startServer() {
  console.log('='.repeat(70));
  console.log('🌱 Starting Smart Farm DBMS REST API Backend...');
  console.log('='.repeat(70));

  // Verify database connection at startup
  const dbHealth = await checkConnection();
  if (dbHealth.connected) {
    const dbType = dbHealth.type === 'sqlite' ? 'SQLite' : 'MySQL';
    console.log(`✅ [Database] Connected successfully to ${dbType} (${dbHealth.database})`);
    console.log(`ℹ️ [Database] Engine Version: ${dbHealth.version}`);
  } else {
    console.warn(`⚠️ [Database Warning] ${dbHealth.message}`);
    console.warn('ℹ️ [Database Note] API is running in degraded mode.');
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 [Server] Smart Farm API is listening on http://localhost:${PORT}`);
    console.log(`🩺 [Health Check] http://localhost:${PORT}/api/health`);
    console.log(`📋 [API Base] http://localhost:${PORT}/api/v1`);
    console.log('='.repeat(70));
  });

  // Graceful shutdown handling
  const handleShutdown = async (signal) => {
    console.log(`\n🛑 Received ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      console.log('🔒 Closed HTTP server.');
      await closePool();
      console.log('🔒 Closed MySQL connection pool.');
      console.log('👋 Process terminated cleanly.');
      process.exit(0);
    });

    // Force shutdown if cleanup hangs
    setTimeout(() => {
      console.error('⚠️ Forcefully terminating after timeout.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

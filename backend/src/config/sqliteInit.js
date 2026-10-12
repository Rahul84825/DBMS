import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_SQLITE_PATH = path.resolve(__dirname, '../../../backend/data/smart_farm.sqlite');
const SCHEMA_FILE = path.resolve(__dirname, '../../../sql/schema_sqlite.sql');
const DATA_FILE = path.resolve(__dirname, '../../../sql/sample_data_sqlite.sql');

/**
 * Initializes the SQLite database schema and seeds mock data.
 * @param {DatabaseSync} [db] - Optional existing DatabaseSync instance
 * @param {boolean} [forceReset=false] - Whether to drop tables and re-seed
 * @returns {DatabaseSync}
 */
export function initSQLiteDatabase(db = null, forceReset = false) {
  const dbPath = process.env.SQLITE_DB_PATH || DEFAULT_SQLITE_PATH;
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const database = db || new DatabaseSync(dbPath);
  database.exec('PRAGMA foreign_keys = ON;');

  if (forceReset) {
    console.log('🔄 [SQLite] Resetting database tables...');
    const dropOrder = [
      'expense',
      'harvest',
      'irrigation',
      'sensor_reading',
      'sensor',
      'planting',
      'field',
      'crop',
      'farm',
    ];
    for (const table of dropOrder) {
      try {
        database.exec(`DROP TABLE IF EXISTS ${table};`);
      } catch (err) {
        // ignore
      }
    }
  }

  // Check if tables already exist
  const existingTables = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='farm'").all();
  const needsInit = existingTables.length === 0 || forceReset;

  if (needsInit) {
    console.log('🌱 [SQLite] Applying schema from sql/schema_sqlite.sql...');
    if (fs.existsSync(SCHEMA_FILE)) {
      const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf8');
      database.exec(schemaSql);
    } else {
      throw new Error(`Schema file not found at: ${SCHEMA_FILE}`);
    }

    console.log('📦 [SQLite] Seeding mock data from sql/sample_data_sqlite.sql...');
    if (fs.existsSync(DATA_FILE)) {
      const dataSql = fs.readFileSync(DATA_FILE, 'utf8');
      database.exec(dataSql);
    } else {
      throw new Error(`Data file not found at: ${DATA_FILE}`);
    }

    // Verify row counts
    const farmCount = database.prepare('SELECT COUNT(*) AS c FROM farm').all()[0]?.c || 0;
    const cropCount = database.prepare('SELECT COUNT(*) AS c FROM crop').all()[0]?.c || 0;
    const fieldCount = database.prepare('SELECT COUNT(*) AS c FROM field').all()[0]?.c || 0;
    const sensorCount = database.prepare('SELECT COUNT(*) AS c FROM sensor').all()[0]?.c || 0;
    const readingCount = database.prepare('SELECT COUNT(*) AS c FROM sensor_reading').all()[0]?.c || 0;

    console.log(`✅ [SQLite] Database initialized and seeded successfully at: ${dbPath}`);
    console.log(`📊 [SQLite Stats] Farms: ${farmCount}, Crops: ${cropCount}, Fields: ${fieldCount}, Sensors: ${sensorCount}, Readings: ${readingCount}`);
  } else {
    // Check if there are readings seeded
    const readingCount = database.prepare('SELECT COUNT(*) AS c FROM sensor_reading').all()[0]?.c || 0;
    if (readingCount === 0 && fs.existsSync(DATA_FILE)) {
      console.log('📦 [SQLite] Seeding missing mock data into existing database...');
      database.exec(fs.readFileSync(DATA_FILE, 'utf8'));
    }
    console.log(`ℹ️ [SQLite] Using existing SQLite database at: ${dbPath}`);
  }

  return database;
}

// Allow direct execution: `node backend/src/config/sqliteInit.js` or `npm run seed`
if (process.argv[1] && process.argv[1].endsWith('sqliteInit.js')) {
  const force = process.argv.includes('--force') || process.argv.includes('-f');
  initSQLiteDatabase(null, force);
}

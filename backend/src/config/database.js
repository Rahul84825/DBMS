import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env relative to backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_farm_db',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  queueLimit: 0,
  decimalNumbers: true, // Parse DECIMAL types as JavaScript numbers for clean JSON
  timezone: '+00:00',
};

// Create the connection pool
export const pool = mysql.createPool(dbConfig);

/**
 * Executes a parameterized query using the pool.
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<Array>}
 */
export async function query(sql, params = []) {
  const [results] = await pool.execute(sql, params);
  return results;
}

/**
 * Verifies database connectivity.
 * @returns {Promise<{connected: boolean, message: string, version?: string}>}
 */
export async function checkConnection() {
  try {
    const [rows] = await pool.query('SELECT VERSION() AS version');
    const version = rows[0]?.version || 'Unknown';
    return {
      connected: true,
      message: 'Successfully connected to MySQL Server',
      database: dbConfig.database,
      version,
    };
  } catch (error) {
    let friendlyMessage = 'Unable to connect to MySQL database.';
    if (error.code === 'ECONNREFUSED') {
      friendlyMessage = `Connection refused at ${dbConfig.host}:${dbConfig.port}. Ensure MySQL Server is running.`;
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      friendlyMessage = `Access denied for user '${dbConfig.user}'. Please verify your DB_PASSWORD in backend/.env.`;
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      friendlyMessage = `Database '${dbConfig.database}' does not exist. Run sql/01_schema.sql first.`;
    }
    return {
      connected: false,
      message: friendlyMessage,
      code: error.code || 'UNKNOWN_ERROR',
    };
  }
}

/**
 * Closes the connection pool gracefully.
 */
export async function closePool() {
  try {
    await pool.end();
  } catch (err) {
    // ignore on exit
  }
}

export default {
  pool,
  query,
  checkConnection,
  closePool,
};

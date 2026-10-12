import { DatabaseSync } from 'node:sqlite';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initSQLiteDatabase, DEFAULT_SQLITE_PATH } from './sqliteInit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env relative to backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_CLIENT = (process.env.DB_CLIENT || 'sqlite').toLowerCase();
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || DEFAULT_SQLITE_PATH;

let sqliteDb = null;
let mysqlPool = null;

// Helper to normalize parameters for SQLite (handling booleans, Dates, nulls)
function normalizeSQLiteParam(v) {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Date) return v.toISOString().replace('T', ' ').substring(0, 19);
  if (v === undefined) return null;
  return v;
}

if (DB_CLIENT === 'sqlite') {
  try {
    sqliteDb = initSQLiteDatabase(null, false);
    console.log(`🗄️ [Database] SQLite database initialized at ${SQLITE_DB_PATH}`);
  } catch (err) {
    console.error('❌ [Database Error] Failed to initialize SQLite:', err.message);
  }
} else {
  // MySQL connection pool initialization
  const mysqlConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_farm_db',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    queueLimit: 0,
    decimalNumbers: true,
    timezone: '+00:00',
  };
  mysqlPool = mysql.createPool(mysqlConfig);
}

/**
 * Executes a parameterized query against the active database (SQLite or MySQL).
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<Array|Object>}
 */
export async function query(sql, params = []) {
  if (DB_CLIENT === 'sqlite') {
    if (!sqliteDb) {
      sqliteDb = initSQLiteDatabase(null, false);
    }

    const trimmedSql = sql.trim();
    const upperSql = trimmedSql.toUpperCase();
    const normalizedParams = params.map(normalizeSQLiteParam);

    const isSelect = upperSql.startsWith('SELECT') || upperSql.startsWith('WITH') || upperSql.startsWith('PRAGMA') || upperSql.startsWith('EXPLAIN');

    const stmt = sqliteDb.prepare(trimmedSql);

    if (isSelect) {
      const rows = stmt.all(...normalizedParams);
      return rows;
    } else {
      const info = stmt.run(...normalizedParams);
      return {
        insertId: Number(info.lastInsertRowid),
        affectedRows: Number(info.changes),
        changes: Number(info.changes),
      };
    }
  }

  // MySQL fallback
  const [results] = await mysqlPool.execute(sql, params);
  return results;
}

/**
 * Verifies database connectivity and returns health information.
 * @returns {Promise<{connected: boolean, message: string, database?: string, version?: string, type?: string}>}
 */
export async function checkConnection() {
  if (DB_CLIENT === 'sqlite') {
    try {
      if (!sqliteDb) {
        sqliteDb = initSQLiteDatabase(null, false);
      }
      const rows = sqliteDb.prepare('SELECT sqlite_version() AS version').all();
      const version = rows[0]?.version || '3.x';
      return {
        connected: true,
        message: 'Successfully connected to SQLite database',
        database: path.basename(SQLITE_DB_PATH),
        version: `SQLite ${version}`,
        type: 'sqlite',
      };
    } catch (error) {
      return {
        connected: false,
        message: `SQLite error: ${error.message}`,
        code: error.code || 'SQLITE_ERROR',
        type: 'sqlite',
      };
    }
  }

  // MySQL check
  try {
    const [rows] = await mysqlPool.query('SELECT VERSION() AS version');
    const version = rows[0]?.version || 'Unknown';
    return {
      connected: true,
      message: 'Successfully connected to MySQL Server',
      database: process.env.DB_NAME || 'smart_farm_db',
      version,
      type: 'mysql',
    };
  } catch (error) {
    let friendlyMessage = 'Unable to connect to MySQL database.';
    if (error.code === 'ECONNREFUSED') {
      friendlyMessage = `Connection refused at ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}. Ensure MySQL Server is running.`;
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      friendlyMessage = `Access denied for user '${process.env.DB_USER}'. Please verify your DB_PASSWORD in backend/.env.`;
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      friendlyMessage = `Database '${process.env.DB_NAME}' does not exist. Run sql/01_schema.sql first.`;
    }
    return {
      connected: false,
      message: friendlyMessage,
      code: error.code || 'UNKNOWN_ERROR',
      type: 'mysql',
    };
  }
}

/**
 * Closes the active database connection pool gracefully.
 */
export async function closePool() {
  try {
    if (DB_CLIENT === 'sqlite' && sqliteDb) {
      sqliteDb.close();
      sqliteDb = null;
    } else if (mysqlPool) {
      await mysqlPool.end();
    }
  } catch (err) {
    // ignore on exit
  }
}

// Pool interface compatibility
export const pool = {
  execute: async (sql, params = []) => {
    const res = await query(sql, params);
    return [res];
  },
  query: async (sql, params = []) => {
    const res = await query(sql, params);
    return [res];
  },
  end: closePool,
};

export default {
  pool,
  query,
  checkConnection,
  closePool,
};

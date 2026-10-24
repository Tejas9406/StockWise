import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]:', err.message);
});

/**
 * Direct query execution
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Get client for PostgreSQL transactional blocks
 */
export const getClient = () => pool.connect();

/**
 * Transaction runner helper
 */
export const runTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log('[PostgreSQL] Connected successfully to Neon cloud operational database');
    client.release();
  } catch (err) {
    console.error('[PostgreSQL Connection Error]:', err.message);
  }
};

export default { pool, query, getClient, runTransaction, connectDB };

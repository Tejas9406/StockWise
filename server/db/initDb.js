import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

export const initPostgresDatabase = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is missing.');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('[PostgreSQL] Connecting to Neon cloud database...');
    const client = await pool.connect();
    console.log('[PostgreSQL] Connected! Executing schema.sql DDL migrations...');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await client.query(schemaSql);
    console.log('[PostgreSQL] Schema initialized successfully! All 15 operational tables and indexes ready.');

    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.error('[PostgreSQL] Database initialization error:', error.message);
    await pool.end();
    throw error;
  }
};

if (process.argv[1].endsWith('initDb.js')) {
  initPostgresDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

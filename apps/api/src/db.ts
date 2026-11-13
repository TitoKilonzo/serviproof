import pg from 'pg';
import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config();
// Local development keeps a single root .env; production injects variables directly.
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined, max: 15, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 8_000 });
pool.on('error', (err) => console.error('Unexpected PostgreSQL pool error', err));
export type DbClient = pg.PoolClient;

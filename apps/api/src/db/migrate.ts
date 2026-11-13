import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';
const sql = await fs.readFile(path.resolve(process.cwd(), 'migrations/001_initial.sql'), 'utf8');
try { await pool.query(sql); console.log('Database migration completed.'); }
finally { await pool.end(); }

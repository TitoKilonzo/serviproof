import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db.js';
import { asyncHandler } from '../utils.js';
import { authenticate, clearSession, setSession } from '../middleware/auth.js';
import type { SessionUser } from '../types.js';
const router = Router();
const loginSchema = z.object({ email: z.string().email().max(190), password: z.string().min(8).max(120), companySlug: z.string().min(2).max(80) });
const registerSchema = z.object({ companyName: z.string().min(2).max(120), fullName: z.string().min(2).max(120), email: z.string().email().max(190), password: z.string().min(10).max(120), phone: z.string().max(40).optional() });
router.post('/login', asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password.' });
  const email = parsed.data.email.toLowerCase();
  const result = await pool.query(`SELECT u.id,u.company_id,u.customer_id,u.full_name,u.email,u.password_hash,u.role,c.name AS company_name,c.slug AS company_slug
    FROM users u JOIN companies c ON c.id=u.company_id WHERE lower(u.email)=lower($1) AND u.is_active=true AND c.slug=$2 ORDER BY u.created_at ASC LIMIT 1`, [email, parsed.data.companySlug]);
  const row = result.rows[0];
  if (!row || !(await bcrypt.compare(parsed.data.password, row.password_hash))) return res.status(401).json({ error: 'The email or password you entered is incorrect.' });
  await pool.query('UPDATE users SET last_login_at=now() WHERE id=$1', [row.id]);
  const user: SessionUser = { id: row.id, companyId: row.company_id, customerId: row.customer_id, fullName: row.full_name, email: row.email, role: row.role, companyName: row.company_name, companySlug: row.company_slug };
  setSession(res, user); res.json({ user });
}));
router.post('/register', asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Please check your details.' });
  const { companyName, fullName, email, password, phone } = parsed.data;
  const slug = companyName.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,55) + '-' + Math.random().toString(36).slice(2,6);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const company = await client.query('INSERT INTO companies(name,slug,email,phone) VALUES($1,$2,$3,$4) RETURNING id,name,slug', [companyName,slug,email.toLowerCase(),phone ?? null]);
    const hash = await bcrypt.hash(password, 12);
    const created = await client.query(`INSERT INTO users(company_id,full_name,email,password_hash,role,phone) VALUES($1,$2,$3,$4,'owner',$5) RETURNING id,company_id,full_name,email,role`, [company.rows[0].id,fullName,email.toLowerCase(),hash,phone ?? null]);
    await client.query('COMMIT');
    const user: SessionUser = { id: created.rows[0].id, companyId: created.rows[0].company_id, customerId: null, fullName: created.rows[0].full_name, email: created.rows[0].email, role: created.rows[0].role, companyName: company.rows[0].name, companySlug: company.rows[0].slug };
    setSession(res,user); res.status(201).json({ user });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));
router.get('/me', authenticate, asyncHandler(async (req, res) => res.json({ user: (req as any).user })));
router.post('/logout', (_req, res) => { clearSession(res); res.json({ ok: true }); });
export default router;

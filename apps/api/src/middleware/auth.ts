import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import type { AuthedRequest, SessionUser } from '../types.js';
const cookieName = 'serviproof_session';
function jwtSecret(){const value=process.env.JWT_SECRET;if(!value||value.length<32)throw new Error('JWT_SECRET must be at least 32 characters long.');return value;}
export function setSession(res: Response, user: SessionUser) {
  const token = jwt.sign({ sub: user.id, companyId: user.companyId }, jwtSecret(), { expiresIn: '12h', issuer: 'serviproof' });
  res.cookie(cookieName, token, { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: process.env.COOKIE_SECURE === 'true' ? 'none' : 'lax', maxAge: 12 * 60 * 60 * 1000, path: '/' });
}
export function clearSession(res: Response) { res.clearCookie(cookieName, { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: process.env.COOKIE_SECURE === 'true' ? 'none' : 'lax', path: '/' }); }
export async function authenticate(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[cookieName];
    if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });
    const payload = jwt.verify(token, jwtSecret(), { issuer: 'serviproof' }) as jwt.JwtPayload;
    const result = await pool.query(`SELECT u.id,u.company_id,u.customer_id,u.full_name,u.email,u.role,c.name AS company_name,c.slug AS company_slug
      FROM users u JOIN companies c ON c.id=u.company_id WHERE u.id=$1 AND u.company_id=$2 AND u.is_active=true`, [payload.sub, payload.companyId]);
    if (!result.rowCount) { clearSession(res); return res.status(401).json({ error: 'Your session is no longer valid.' }); }
    const row = result.rows[0];
    req.user = { id: row.id, companyId: row.company_id, customerId: row.customer_id, fullName: row.full_name, email: row.email, role: row.role, companyName: row.company_name, companySlug: row.company_slug };
    next();
  } catch {
    clearSession(res);
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

import type { NextFunction, Request, Response, RequestHandler } from 'express';
import type { AuthedRequest, Role } from './types.js';
export const asyncHandler = (fn: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { Promise.resolve(fn(req as AuthedRequest, res, next)).catch(next); };
export function requireRole(...roles: Role[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    next();
  };
}
export function parseId(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
export async function audit(db: { query: (sql: string, values?: unknown[]) => Promise<unknown> }, companyId: string, userId: string, action: string, entityType: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  await db.query('INSERT INTO audit_logs(company_id,user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5,$6)', [companyId,userId,action,entityType,entityId ?? null,JSON.stringify(metadata)]);
}

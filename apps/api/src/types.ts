import type { Request } from 'express';
export type Role = 'owner' | 'admin' | 'dispatcher' | 'technician' | 'customer';
export interface SessionUser { id: string; companyId: string; companyName: string; companySlug: string; fullName: string; email: string; role: Role; customerId: string | null; }
export interface AuthedRequest extends Request { user?: SessionUser; }

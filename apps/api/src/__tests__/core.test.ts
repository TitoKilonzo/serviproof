import { describe, expect, it } from 'vitest';
import { nextDate } from '../services/recurrence.js';
import { parseId } from '../utils.js';
describe('recurring service date calculation',()=>{
  it('advances monthly dates without overflowing month end',()=>{expect(nextDate('2026-01-31','monthly',null)).toBe('2026-02-28');});
  it('preserves the clamped day on the next month',()=>{expect(nextDate('2026-02-28','monthly',null)).toBe('2026-03-28');});
  it('advances quarterly contracts by three months',()=>{expect(nextDate('2026-11-30','quarterly',null)).toBe('2027-02-28');});
  it('advances custom cycles using explicit interval days',()=>{expect(nextDate('2026-11-13','custom',21)).toBe('2026-12-04');});
});
describe('UUID validation',()=>{
  it('accepts a standard UUID',()=>{expect(parseId('550e8400-e29b-41d4-a716-446655440000')).toBe(true);});
  it('rejects malformed identifiers',()=>{expect(parseId('not-a-real-id')).toBe(false);});
});

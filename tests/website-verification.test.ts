import { describe, expect, it } from 'vitest';
import { isWebsiteVerificationCurrent } from '../src/lib/security/website-verification';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-11-17T12:00:00.000Z');

describe('isWebsiteVerificationCurrent', () => {
  it('accepts a successful check younger than 30 days', () => {
    expect(isWebsiteVerificationCurrent(true, new Date(NOW - 29 * DAY).toISOString(), NOW)).toBe(true);
  });

  it('expires a successful check at 30 days', () => {
    expect(isWebsiteVerificationCurrent(true, new Date(NOW - 30 * DAY).toISOString(), NOW)).toBe(false);
  });

  it('fails closed when the check failed or has no timestamp', () => {
    expect(isWebsiteVerificationCurrent(false, new Date(NOW).toISOString(), NOW)).toBe(false);
    expect(isWebsiteVerificationCurrent(true, null, NOW)).toBe(false);
  });

  it('fails closed for invalid or future timestamps', () => {
    expect(isWebsiteVerificationCurrent(true, 'not-a-date', NOW)).toBe(false);
    expect(isWebsiteVerificationCurrent(true, new Date(NOW + DAY).toISOString(), NOW)).toBe(false);
  });
});

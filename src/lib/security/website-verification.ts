const WEBSITE_VERIFICATION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function isWebsiteVerificationCurrent(
  isSecure: boolean | null | undefined,
  verifiedAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!isSecure || !verifiedAt) return false;
  const timestamp = Date.parse(verifiedAt);
  if (!Number.isFinite(timestamp) || timestamp > now) return false;
  return now - timestamp < WEBSITE_VERIFICATION_MAX_AGE_MS;
}

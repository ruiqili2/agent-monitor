/**
 * CSRF Protection Utility
 * Validates Origin/Referer headers for state-changing requests
 */

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:3001',
];

export function validateCSRF(origin: string | null, referer: string | null): boolean {
  if (!origin && !referer) {
    return false;
  }

  const checkUrl = origin || referer;
  if (!checkUrl) return false;

  return ALLOWED_ORIGINS.some(allowed => 
    checkUrl.startsWith(allowed)
  );
}

export function getCSRFToken(): string {
  return process.env.CSRF_SECRET || 'dev-secret-token';
}

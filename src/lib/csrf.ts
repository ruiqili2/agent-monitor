/**
 * CSRF Protection Utility
 * Validates Origin/Referer headers for state-changing requests
 */

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://192.168.1.37:3000',
];

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',').map(v => v.trim()).filter(Boolean) || DEFAULT_ALLOWED_ORIGINS;

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

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateCSRF } from './lib/csrf';

export function middleware(request: NextRequest) {
  // Only validate state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    
    if (!validateCSRF(origin, referer)) {
      return NextResponse.json(
        { error: 'Forbidden - Invalid origin' },
        { status: 403 }
      );
    }
  }

  // Add security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};

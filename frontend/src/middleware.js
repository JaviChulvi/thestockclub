import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import {NextResponse} from 'next/server';

const BLOCKED_COUNTRIES = new Set([
  'CN', 'HK', 'TW', 'JP', 'KR', 'IN', 'TH', 'VN',
  'PH', 'MY', 'ID', 'SG', 'BD', 'PK', 'LK'
]);

const intlMiddleware = createMiddleware(routing);

export default function middleware(request) {
  const country = request.geo?.country;

  if (country && BLOCKED_COUNTRIES.has(country)) {
    return new NextResponse(null, { status: 403 });
  }

  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};


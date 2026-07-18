import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Constants defined locally to avoid bundler injecting __dirname in Edge Runtime
const TOKEN_KEY = 'finsense_token';
const PUBLIC_ROUTES = ['/auth'];
const AUTH_ROUTE = '/auth';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes through (root + any /auth/* path)
  const isPublic =
    pathname === '/' ||
    PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (isPublic) return NextResponse.next();

  const token = request.cookies.get(TOKEN_KEY)?.value;

  // No token → redirect to login
  if (!token) {
    const loginUrl = new URL(AUTH_ROUTE, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si tiene token, permitimos el acceso.
  // La validación de expiración y firma la hará el Backend en cada petición de la API,
  // y si expira, el frontend redirigirá a login automáticamente por interceptores de Axios.
  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
};

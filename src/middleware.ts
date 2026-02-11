import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenEdge } from '@/lib/auth-edge';

const publicPaths = ['/login', '/register'];
const adminPaths = ['/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('session')?.value;

  let user = null;
  if (token) {
    user = await verifyTokenEdge(token);
  }

  const isPublicPath = publicPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
  const isAdminPath = adminPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));

  // Redirect logged-in users away from auth pages
  if (user && isPublicPath) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Redirect unauthenticated users to login
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Block non-admins from admin pages
  if (user && isAdminPath && user.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - API routes (handled separately)
     * - Static files (_next, favicon, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};

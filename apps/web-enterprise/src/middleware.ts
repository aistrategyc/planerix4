import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// List of paths that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/verify-email',
  '/landing',
  '/terms',
  '/privacy',
  '/', // Landing page
  '/invitations', // Allow invitation links
]

// Paths that should redirect authenticated users away (e.g., login page)
const AUTH_ONLY_PATHS = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check if path is public
  const isPublicPath = PUBLIC_PATHS.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  )

  // Check for authentication token in localStorage (via cookie)
  // Since middleware runs on server, we check for refresh token cookie
  const hasRefreshToken = request.cookies.has('refresh_token')
  const hasAccessToken = request.cookies.has('access_token')

  // Also check for localStorage token (passed via custom header from client)
  const hasLocalStorageToken = request.headers.get('x-has-token') === 'true'

  const isAuthenticated = hasRefreshToken || hasAccessToken || hasLocalStorageToken

  // If trying to access auth-only page (login/register) while authenticated
  if (AUTH_ONLY_PATHS.includes(pathname) && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If not authenticated and trying to access protected route
  if (!isPublicPath && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

// Configure which routes middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}

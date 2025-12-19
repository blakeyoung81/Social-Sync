import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        try {
        // Public paths that don't require authentication
        const publicPaths = [
          '/login',
          '/signup',
          '/forgot-password',
          '/privacy-policy',
          '/terms-of-service',
          '/data-deletion',
        ];
          
          const pathname = req.nextUrl.pathname;
          const isPublicPath = publicPaths.some(path => 
            pathname === path || pathname.startsWith(path)
          );
          
          // Allow public paths, API routes, and static files
          if (
            isPublicPath ||
            pathname.startsWith('/api') ||
            pathname.startsWith('/_next') ||
            pathname.startsWith('/favicon.ico') ||
            /\.(png|jpg|jpeg|gif|svg|ico|webp)$/.test(pathname)
          ) {
            return true; // Allow access
          }
          
          // Require token for protected paths
          return !!token;
        } catch (error) {
          console.error('Middleware error:', error);
          // Allow access on error to prevent blocking
          return true;
        }
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public pages (privacy-policy, terms-of-service, data-deletion)
     * - auth pages (login, signup)
     * - static assets (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|login|signup|forgot-password|privacy-policy|terms-of-service|data-deletion|app-icon\\.png|app-icon\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}


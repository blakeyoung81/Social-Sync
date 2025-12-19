import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // This function runs after authorization check
    // Public paths are already allowed by the authorized callback
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Public paths that don't require authentication
        const publicPaths = [
          '/login',
          '/signup',
          '/privacy-policy',
          '/terms-of-service',
          '/data-deletion',
          '/app-icon.png',
          '/app-icon.svg',
        ];
        
        const isPublicPath = publicPaths.some(path => 
          req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith(path)
        );
        
        // Allow public paths, API routes, and static files
        if (
          isPublicPath ||
          req.nextUrl.pathname.startsWith('/api') ||
          req.nextUrl.pathname.startsWith('/_next') ||
          req.nextUrl.pathname.startsWith('/favicon.ico') ||
          req.nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)
        ) {
          return true; // Allow access
        }
        
        // Require token for protected paths
        return !!token;
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
    '/((?!_next/static|_next/image|favicon.ico|login|signup|privacy-policy|terms-of-service|data-deletion|app-icon\\.png|app-icon\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}


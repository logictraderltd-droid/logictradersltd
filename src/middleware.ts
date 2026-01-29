import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Protected routes configuration
const PROTECTED_ROUTES = {
  customer: [
    '/dashboard',
    '/dashboard/courses',
    '/dashboard/signals',
    '/dashboard/bots',
    '/dashboard/payments',
    '/dashboard/profile',
  ],
  admin: [
    '/admin',
    '/admin/users',
    '/admin/products',
    '/admin/orders',
    '/admin/signals',
    '/admin/settings',
  ],
};

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/courses',
  '/signals',
  '/bots',
  '/pricing',
  '/about',
  '/contact',
  '/api/auth',
  '/api/webhooks',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create Supabase client
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Get user session
  // Using getUser() as recommended by Supabase for security
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log(`[Middleware] Path: ${pathname}`);
  console.log(`[Middleware] User found: ${!!user}, ID: ${user?.id}`);

  // Check if route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );

  // Allow public routes
  if (isPublicRoute) {
    // console.log(`[Middleware] Public route allowed: ${pathname}`);
    return response;
  }

  // Check API routes
  if (pathname.startsWith('/api/')) {
    // Allow webhook routes without auth
    if (pathname.startsWith('/api/webhooks/')) {
      return response;
    }
    // Other API routes may need auth - handle in individual routes
    return response;
  }

  // Check if user is authenticated
  if (!user) {
    console.log(`[Middleware] No user found for protected route, redirecting to login`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Get user role from database
  // console.log(`[Middleware] Fetching user role for: ${user.id}`);
  const { data: userData, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  // If error is anything other than "no rows found" (which maybeSingle handles by returning null), log it
  // If userData is null, it means the public record doesn't exist yet (likely new user). 
  // We'll treat them as a 'customer' to allow access to the dashboard.
  if (error) {
    console.error('Error fetching user role:', error);
  }

  // Role fallback: Check if user record exists, otherwise default to customer
  // Emergency access: admin@logictradersltd.com and logictraderltd@gmail.com are ALWAYS admins
  const userRole = userData?.role ||
    (user.email === 'admin@logictradersltd.com' || user.email === 'logictraderltd@gmail.com' ? 'admin' : 'customer');

  console.log(`[Middleware] Resolved role: ${userRole} for ${user.email}`);

  // Check admin routes
  const isAdminRoute = PROTECTED_ROUTES.admin.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );

  if (isAdminRoute && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Check customer routes
  const isCustomerRoute = PROTECTED_ROUTES.customer.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );

  if (isCustomerRoute && userRole !== 'customer' && userRole !== 'admin') {
    // If they have some other role (e.g. suspended?), maybe redirect to login or a blocked page
    // For now, assuming only admin/customer exist
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

// Configure middleware matcher
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};

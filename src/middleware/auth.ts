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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if route is public
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  if (isPublicRoute) {
    return response;
  }

  // Check if user is authenticated
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Get user role from database
  const { data: userData, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || !userData) {
    console.error('Error fetching user role:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const userRole = userData.role;

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

// Helper function to check if user has access to a product
export async function checkProductAccess(
  request: NextRequest,
  productId: string
): Promise<boolean> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {},
        remove(name: string, options: CookieOptions) {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Check if user has access
  const { data: access, error } = await supabase
    .from('user_access')
    .select('*')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .eq('is_active', true)
    .or('access_expires_at.is.null,access_expires_at.gte.' + new Date().toISOString())
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking access:', error);
    return false;
  }

  return !!access;
}

// Helper function to get user role
export async function getUserRole(request: NextRequest): Promise<string | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {},
        remove(name: string, options: CookieOptions) {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching user role:', error);
    return null;
  }

  return data?.role || null;
}

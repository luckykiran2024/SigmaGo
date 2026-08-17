import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const startTime = performance.now();
  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith('/login') || path.startsWith('/auth');
  const isPublicPage =
    path === '/' ||
    path.startsWith('/product') ||
    path.startsWith('/about') ||
    path.startsWith('/blog') ||
    path === '/sitemap.xml' ||
    path === '/robots.txt';

  // Helper to attach Server-Timing header to responses
  const withServerTiming = (response: NextResponse) => {
    const duration = Math.round(performance.now() - startTime);
    response.headers.set('Server-Timing', `proxy;dur=${duration}`);
    return response;
  };

  // --- Fast path for public and auth pages ---
  if (isPublicPage || isAuthPage) {
    const url = request.nextUrl;
    const hostname = request.headers.get('host') || '';
    const isLocalhost = hostname.includes('localhost');
    const domainParts = hostname.split('.');
    
    let tenant = '';
    if (isLocalhost) {
      if (domainParts.length > 1) {
        tenant = domainParts[0];
      }
    } else {
      if (hostname.endsWith('.sigmago.app')) {
        tenant = hostname.replace('.sigmago.app', '');
      } else if (hostname === 'sigmago.app' || hostname.endsWith('.vercel.app')) {
        tenant = '';
      } else {
        tenant = hostname;
      }
    }

    if (tenant && !isPublicPage && !isAuthPage && !url.pathname.startsWith('/' + tenant) && !path.startsWith('/api')) {
      const newUrl = new URL('/' + tenant + url.pathname, request.url)
      return withServerTiming(NextResponse.rewrite(newUrl))
    }

    return withServerTiming(NextResponse.next())
  }

  // --- Protected Tenant Route Proxy Logic ---
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Auth protection for protected non-api routes
  if (!user && !path.startsWith('/api')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return withServerTiming(NextResponse.redirect(url))
  }

  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const isLocalhost = hostname.includes('localhost');
  const domainParts = hostname.split('.');
  
  let tenant = '';
  
  if (isLocalhost) {
    if (domainParts.length > 1) {
      tenant = domainParts[0];
    }
  } else {
    if (hostname.endsWith('.sigmago.app')) {
      tenant = hostname.replace('.sigmago.app', '');
    } else if (hostname === 'sigmago.app' || hostname.endsWith('.vercel.app')) {
      tenant = '';
    } else {
      tenant = hostname;
    }
  }

  if (tenant && !url.pathname.startsWith('/' + tenant) && !path.startsWith('/api')) {
    const newUrl = new URL('/' + tenant + url.pathname, request.url)
    return withServerTiming(NextResponse.rewrite(newUrl, {
      request: supabaseResponse.headers ? supabaseResponse : undefined
    }))
  }

  return withServerTiming(supabaseResponse)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

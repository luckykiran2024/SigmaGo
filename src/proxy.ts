import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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

  // Define public pages that do not require auth and should not be rewritten to tenant scope
  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith('/login') || path.startsWith('/auth');
  const isPublicPage =
    path === '/' ||
    path.startsWith('/product') ||
    path.startsWith('/about') ||
    path.startsWith('/blog') ||
    path === '/sitemap.xml' ||
    path === '/robots.txt';

  // --- Auth Protection ---
  if (!user && !isAuthPage && !isPublicPage && !path.startsWith('/api')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // --- Tenant Proxy Logic ---
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const isLocalhost = hostname.includes('localhost');
  const domainParts = hostname.split('.');
  
  let tenant = '';
  
  if (isLocalhost) {
    // If it has a subdomain on localhost (e.g. meridian.localhost:3000), route to that tenant.
    // If it is just localhost:3000, keep tenant as empty "" so it can serve the public marketing landing page.
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

  // Do not rewrite public marketing pages to a tenant path
  if (tenant && !isPublicPage && !isAuthPage && !url.pathname.startsWith('/' + tenant) && !request.nextUrl.pathname.startsWith('/api')) {
    const newUrl = new URL('/' + tenant + url.pathname, request.url)
    return NextResponse.rewrite(newUrl, {
      request: supabaseResponse.headers ? supabaseResponse : undefined
    })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

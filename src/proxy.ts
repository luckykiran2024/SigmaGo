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

  // --- Auth Protection ---
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/auth')
  if (!user && !isAuthPage && !request.nextUrl.pathname.startsWith('/api')) {
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
    tenant = domainParts.length > 1 ? domainParts[0] : 'meridian'; 
  } else {
    if (hostname.endsWith('.sigmago.app')) {
      tenant = hostname.replace('.sigmago.app', '');
    } else if (hostname === 'sigmago.app' || hostname.endsWith('.vercel.app')) {
      tenant = '';
    } else {
      tenant = hostname;
    }
  }

  if (tenant && !url.pathname.startsWith('/' + tenant) && !isAuthPage && !request.nextUrl.pathname.startsWith('/api')) {
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

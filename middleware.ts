import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
  // --- 1. SETUP RESPONSE & SUPABASE CLIENT ---
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log(`[DEBUG ENV] URL Exists: ${!!supabaseUrl}`);
  console.log(`[DEBUG ENV] Key Exists: ${!!supabaseKey}`);
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // --- 2. CEK USER ---
  // Kita pakai getUser() agar lebih aman & validasi ke server
  const { data: { user }, error } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // --- DEBUGGING LOGS (Lihat di Terminal VS Code Anda) ---
  console.log(`[MIDDLEWARE] Path: ${path}`)
  console.log(`[MIDDLEWARE] User Status: ${user ? '✅ Logged In (' + user.email + ')' : '❌ Guest'}`)
  if (error) console.log(`[MIDDLEWARE] Auth Error:`, error.message)

  // --- 3. LOGIKA PROTEKSI ---

  // A. User BELUM Login -> Coba akses halaman dalam (selain login)
  if (!user && path !== '/login') {
    console.log(`[MIDDLEWARE] ⛔ Access Denied. Redirecting to /login`)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // B. User SUDAH Login -> Coba akses halaman login
  if (user && path === '/login') {
    console.log(`[MIDDLEWARE] ⏩ Already Logged In. Redirecting to Dashboard`)
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes
     * - static files (_next/static, _next/image)
     * - favicon, logo, images
     */
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
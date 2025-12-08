import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware function to validate user sessions and handle authentication redirects.
 *
 * Responsibilities:
 * - Refreshes the user's Supabase auth session on each request
 * - Protects routes requiring authentication (/dashboard, /admin, /settings, /platform)
 * - Redirects unauthenticated users to /login with ?next= parameter (TKT-006)
 * - Redirects authenticated users away from auth pages (/login, /signup) to their dashboard
 *
 * @param request - The incoming Next.js request object
 * @returns NextResponse with appropriate redirects or the original response
 *
 * @example
 * // In middleware.ts:
 * export async function middleware(request: NextRequest) {
 *   return await updateSession(request);
 * }
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
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
          const value = request.cookies.get(name)?.value;
          console.log(`[Middleware] Cookie get "${name}":`, value ? "exists" : "not found");
          return value;
        },
        set(name: string, value: string, options: CookieOptions) {
          console.log(`[Middleware] Cookie set "${name}"`);
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          console.log(`[Middleware] Cookie remove "${name}"`);
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Refresh session if expired
  const { data: { user }, error } = await supabase.auth.getUser();
  console.log(`[Middleware] Path: ${request.nextUrl.pathname}, User: ${user?.email || "none"}, Error: ${error?.message || "none"}`);

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = ["/dashboard", "/admin", "/settings", "/platform"];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isProtectedPath && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Auth routes - redirect based on user role if already authenticated
  const authPaths = ["/login", "/signup"];
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAuthPath && user) {
    // Check user's role to determine redirect destination
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    
    const isAdmin = profile?.role === "admin";
    const redirectUrl = isAdmin ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return response;
}


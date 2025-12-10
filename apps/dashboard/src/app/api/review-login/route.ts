import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Magic login endpoint for PM review
 * 
 * Usage: GET /api/review-login?token=abc123
 * 
 * 1. Fetches token details from PM dashboard
 * 2. Logs in with stored credentials
 * 3. Redirects to the target page
 * 
 * This enables PMs to click one link and land on the exact page
 * they need to review, already logged in as the test user.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Missing token parameter" },
      { status: 400 }
    );
  }

  // Validate token format (64 hex chars)
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return NextResponse.json(
      { error: "Invalid token format" },
      { status: 400 }
    );
  }

  // Step 1: Fetch token details from PM dashboard
  const pmDashboardUrl = process.env.PM_DASHBOARD_URL || "http://localhost:3456";
  console.log(`[review-login] Fetching token from ${pmDashboardUrl}/api/v2/review-tokens/${token.substring(0, 8)}...`);
  
  let tokenData;
  try {
    const tokenResponse = await fetch(`${pmDashboardUrl}/api/v2/review-tokens/${token}`, {
      cache: 'no-store'
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json().catch(() => ({ error: "Token lookup failed" }));
      console.error("[review-login] Token lookup failed:", error);
      return NextResponse.json(
        { error: error.error || "Invalid or expired token" },
        { status: tokenResponse.status }
      );
    }

    tokenData = await tokenResponse.json();
    console.log("[review-login] Token data received for:", tokenData.ticket_id);
  } catch (fetchError) {
    console.error("[review-login] Fetch error:", fetchError);
    return NextResponse.json(
      { error: `Failed to fetch token: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}` },
      { status: 500 }
    );
  }

  const { user_email, user_password, redirect_path } = tokenData;

  if (!user_email || !user_password) {
    return NextResponse.json(
      { error: "Invalid token data - missing credentials" },
      { status: 400 }
    );
  }

  // Step 2: Create Supabase client and sign in
  console.log(`[review-login] Attempting to sign in as ${user_email}`);
  
  // Check for required env vars - if missing, redirect with preview mode instead
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("[review-login] Missing Supabase env vars - using preview redirect mode");
    // Fallback: redirect to the page with preview params (app can show demo content)
    const redirectUrl = new URL(redirect_path || "/dashboard", request.url);
    redirectUrl.searchParams.set("preview", "true");
    redirectUrl.searchParams.set("ticket", tokenData.ticket_id);
    redirectUrl.searchParams.set("user", user_email);
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch {
              // Handle cookies in Server Components
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch {
              // Handle cookies in Server Components
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email: user_email,
      password: user_password,
    });

    if (error) {
      console.error("[review-login] Auth error:", error.message);
      return NextResponse.json(
        { error: `Login failed: ${error.message}` },
        { status: 401 }
      );
    }

    console.log(`[review-login] Successfully logged in as ${user_email}, redirecting to ${redirect_path}`);

    // Redirect to the target page
    // Use the original host from headers (for tunnel/proxy support) or fall back to request.url
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("host");
    
    let baseUrl: string;
    if (forwardedHost) {
      baseUrl = `${forwardedProto}://${forwardedHost}`;
    } else if (host && !host.includes("localhost")) {
      baseUrl = `${forwardedProto}://${host}`;
    } else {
      baseUrl = request.url;
    }
    
    const redirectUrl = new URL(redirect_path || "/dashboard", baseUrl);
    console.log(`[review-login] Redirecting to: ${redirectUrl.toString()}`);
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error("[review-login] Supabase error:", error);
    return NextResponse.json(
      { error: `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

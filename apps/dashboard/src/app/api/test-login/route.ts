import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Test endpoint to create a session - REMOVE IN PRODUCTION
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const responseHeaders = new Headers();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
          // Also set in response headers
          const cookieValue = `${name}=${value}; Path=${options.path || '/'}; ${options.httpOnly ? 'HttpOnly;' : ''} ${options.secure ? 'Secure;' : ''} SameSite=${options.sameSite || 'Lax'}`;
          responseHeaders.append('Set-Cookie', cookieValue);
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "testuser@example.com",
    password: "testpass123",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Return success message with instructions
  return NextResponse.json({ 
    success: true,
    message: "Login successful! Session created. Now navigate to /dashboard",
    user: data.user?.email
  });
}

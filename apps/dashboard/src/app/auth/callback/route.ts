import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      // If a specific next URL was provided, use it
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      
      // Otherwise, check user's role to determine redirect destination
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();
      
      const isAdmin = profile?.role === "admin";
      const redirectUrl = isAdmin ? "/admin" : "/dashboard";
      
      return NextResponse.redirect(`${origin}${redirectUrl}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}


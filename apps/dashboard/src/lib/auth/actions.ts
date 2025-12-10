"use server";

import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Redirect to admin dashboard after signup
  redirect("/admin");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Check user's role to determine redirect destination
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  redirect(isAdmin ? "/admin" : "/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getCurrentUser() {
  // Opt out of Next.js data caching to ensure fresh organization data
  noStore();

  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  console.log("[getCurrentUser] Auth result:", { userId: user?.id, email: user?.email, authError: authError?.message });
  
  if (!user) {
    console.log("[getCurrentUser] No authenticated user found");
    return null;
  }

  // Get full profile with organization
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*, organization:organizations(*)")
    .eq("id", user.id)
    .single();

  console.log("[getCurrentUser] Profile query result:", { hasProfile: !!profile, profileError: profileError?.message });

  if (!profile) {
    console.log("[getCurrentUser] No profile found for user - user may need to complete onboarding");
    return null;
  }

  // Get agent profile
  const { data: agentProfile } = await supabase
    .from("agent_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return {
    user,
    profile,
    organization: profile.organization,
    agentProfile,
    isAdmin: profile.role === "admin",
    isAgent: profile.role === "agent",
    isPlatformAdmin: profile.is_platform_admin === true,
  };
}


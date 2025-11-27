"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Ghost, Mail, Lock, User, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const supabase = createClient();

  const [invite, setInvite] = useState<{
    id: string;
    email: string;
    full_name: string;
    role: string;
    organization_id: string;
    organization: { name: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch invite details
  useEffect(() => {
    async function fetchInvite() {
      if (!token) {
        setError("Invalid invite link - no token provided");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("invites")
        .select("*, organization:organizations(name)")
        .eq("token", token)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (fetchError || !data) {
        console.error("Invite fetch error:", fetchError);
        setError("This invite is invalid or has expired");
        setLoading(false);
        return;
      }

      setInvite(data);
      setFullName(data.full_name);
      setLoading(false);
    }

    fetchInvite();
  }, [token, supabase]);

  // Handle password signup
  const handlePasswordSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invite) return;

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        setIsSubmitting(false);
        return;
      }

      if (!authData.user) {
        setError("Failed to create account");
        setIsSubmitting(false);
        return;
      }

      // 2. Create user record in invited organization
      const { error: userError } = await supabase.from("users").insert({
        id: authData.user.id,
        organization_id: invite.organization_id,
        email: invite.email,
        full_name: fullName,
        role: invite.role,
      });

      if (userError) {
        console.error("User creation error:", userError);
        // User might have been created by trigger, continue anyway
      }

      // 3. Create agent profile
      const { error: profileError } = await supabase.from("agent_profiles").insert({
        user_id: authData.user.id,
        organization_id: invite.organization_id,
        display_name: fullName,
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        // Continue anyway
      }

      // 4. Mark invite as accepted
      await supabase
        .from("invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      // 5. Redirect to onboarding
      window.location.href = "/onboarding";
    } catch (err) {
      console.error("Signup error:", err);
      setError("An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-900/5" />
        <Loader2 className="w-8 h-8 animate-spin text-primary relative z-10" />
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-900/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative text-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Invalid Invitation</h1>
          <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-900/5" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Ghost className="w-10 h-10 text-primary" />
          <span className="text-2xl font-bold">Ghost-Greeter</span>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">
              Join {invite?.organization?.name || "the team"}
            </h1>
            <p className="text-muted-foreground">
              Set up your account to get started as{" "}
              {invite?.role === "admin" ? "an Admin" : "an Agent"}
            </p>
          </div>

          <form onSubmit={handlePasswordSignup} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={invite?.email || ""}
                  disabled
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted/30 border border-border text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                You can change this later
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-900/5" />
          <Loader2 className="w-8 h-8 animate-spin text-primary relative z-10" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}



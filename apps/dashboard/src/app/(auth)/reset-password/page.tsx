"use client";

import { useState, useRef, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Logo } from "@/lib/components/logo";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const supabase = createClient();
  
  // Track if we've already validated the session to avoid race conditions
  const hasValidatedRef = useRef(false);

  // Check if we have a valid session from the reset link
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Listen for the PASSWORD_RECOVERY event from Supabase
    // This fires when the user clicks a valid reset link and Supabase parses the URL tokens
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (hasValidatedRef.current) return;
        
        if (event === "PASSWORD_RECOVERY" && session) {
          // User clicked a valid reset link - PASSWORD_RECOVERY is the specific event for this
          hasValidatedRef.current = true;
          setIsValidSession(true);
        } else if (event === "SIGNED_IN" && session) {
          // Fallback: sometimes SIGNED_IN fires instead of PASSWORD_RECOVERY
          hasValidatedRef.current = true;
          setIsValidSession(true);
        }
      }
    );

    // Also check if there's already a session (handles page refresh case)
    const checkExistingSession = async () => {
      // Small delay to let Supabase parse URL tokens first
      // This prevents false "invalid link" errors from race conditions
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session && !hasValidatedRef.current) {
        hasValidatedRef.current = true;
        setIsValidSession(true);
      } else if (!hasValidatedRef.current) {
        // Give additional time for the auth event to fire before declaring invalid
        // The PASSWORD_RECOVERY event may take a moment to process
        timeoutId = setTimeout(() => {
          if (!hasValidatedRef.current) {
            hasValidatedRef.current = true;
            setIsValidSession(false);
            setError("This password reset link is invalid or has expired. Please request a new one.");
          }
        }, 2000); // 2 second grace period for auth event
      }
    };

    checkExistingSession();

    return () => {
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const password = passwordRef.current?.value || "";
    const confirmPassword = confirmPasswordRef.current?.value || "";

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    // Invalidate all other sessions (except current) for security
    // This ensures that if password was reset due to compromise,
    // any attacker sessions on other devices are immediately logged out
    const { error: signOutError } = await supabase.auth.signOut({
      scope: 'others'
    });

    if (signOutError) {
      // Log error but don't fail the password reset - password change succeeded
      console.error('Failed to invalidate other sessions:', signOutError);
    }

    setIsSuccess(true);
    setIsLoading(false);

    // Check user's role to determine redirect destination
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      
      const isAdmin = profile?.role === "admin";
      const redirectUrl = isAdmin ? "/admin" : "/dashboard";
      
      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 2000);
    } else {
      // Fallback to dashboard if we can't determine role
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    }
  };

  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-900/5" />
        <Loader2 className="w-8 h-8 animate-spin text-primary relative z-10" />
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
        <div className="flex items-center justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8">
          {!isValidSession ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Link Expired</h1>
              <p className="text-muted-foreground mb-6">
                {error}
              </p>
              <Link
                href="/forgot-password"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
              >
                Request new link
              </Link>
            </div>
          ) : isSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Password updated!</h1>
              <p className="text-muted-foreground mb-4">
                Your password has been successfully reset. Redirecting you to
                the dashboard...
              </p>
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Reset your password</h1>
                <p className="text-muted-foreground">
                  Enter a new password for your account
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="password"
                      type="password"
                      ref={passwordRef}
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
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="confirmPassword"
                      type="password"
                      ref={confirmPasswordRef}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update password"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-900/5" />
          <Loader2 className="w-8 h-8 animate-spin text-primary relative z-10" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}


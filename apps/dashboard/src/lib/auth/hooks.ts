"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User, Organization, AgentProfile } from "@ghost-greeter/domain/database.types";

interface AuthState {
  user: SupabaseUser | null;
  profile: User | null;
  organization: Organization | null;
  agentProfile: AgentProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAgent: boolean;
}

export function useAuth(): AuthState & {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    organization: null,
    agentProfile: null,
    isLoading: true,
    isAdmin: false,
    isAgent: false,
  });

  const supabase = createClient();

  const loadUserData = useCallback(async (userId: string) => {
    try {
      // Get user profile with organization
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*, organization:organizations(*)")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error loading profile:", profileError);
        return;
      }

      // Get agent profile if exists
      const { data: agentProfile } = await supabase
        .from("agent_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      const org = profile.organization as Organization;

      setState((prev) => ({
        ...prev,
        profile: profile as User,
        organization: org,
        agentProfile: agentProfile as AgentProfile | null,
        isAdmin: profile.role === "admin",
        isAgent: profile.role === "agent",
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error loading user data:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [supabase]);

  useEffect(() => {
    // Get initial session
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setState((prev) => ({ ...prev, user }));
        await loadUserData(user.id);
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          setState((prev) => ({ ...prev, user: session.user, isLoading: true }));
          await loadUserData(session.user.id);
        } else if (event === "PASSWORD_RECOVERY" && session?.user) {
          // Handle password recovery flow - user clicked reset link in email
          // Set user but don't load full profile data (they're on reset page)
          setState((prev) => ({ ...prev, user: session.user, isLoading: false }));
        } else if (event === "SIGNED_OUT") {
          setState({
            user: null,
            profile: null,
            organization: null,
            agentProfile: null,
            isLoading: false,
            isAdmin: false,
            isAgent: false,
          });
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, loadUserData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (state.user) {
      await loadUserData(state.user.id);
    }
  }, [state.user, loadUserData]);

  return {
    ...state,
    signOut,
    refreshProfile,
  };
}


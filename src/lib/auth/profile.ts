import { createClient } from "@/lib/supabase/server";
import { hasPublicSupabaseEnv } from "@/lib/supabase/env";
import type { Profile } from "@/types/database";

export type AuthState = {
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  configured: boolean;
};

export async function getAuthState(): Promise<AuthState> {
  if (!hasPublicSupabaseEnv()) {
    return {
      userId: null,
      email: null,
      profile: null,
      configured: false,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      email: null,
      profile: null,
      configured: true,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, role, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: (profile as Profile | null) ?? null,
    configured: true,
  };
}

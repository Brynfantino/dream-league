import { createBrowserClient } from "@supabase/ssr";

import { hasPublicSupabaseEnv, supabaseEnv } from "./env";

/**
 * Browser Supabase client for public reads (and future auth).
 * Returns null when public env vars are not configured.
 */
export function createClient() {
  if (!hasPublicSupabaseEnv()) {
    return null;
  }

  return createBrowserClient(supabaseEnv.url, supabaseEnv.anonKey);
}

/**
 * Supabase clients for public reads (and future auth / admin writes).
 * Requires NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
export { createClient as createBrowserClient } from "./client";
export { createClient as createServerClient } from "./server";
export { createAdminClient } from "./admin";
export { hasPublicSupabaseEnv, supabaseEnv } from "./env";

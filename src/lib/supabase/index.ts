/**
 * Supabase integration is prepared (env example + stubs + SQL migrations)
 * but not connected to a live project from the app yet.
 */
export { createClient as createBrowserClient } from "./client";
export { createClient as createServerClient } from "./server";
export { createAdminClient } from "./admin";
export { hasPublicSupabaseEnv, supabaseEnv } from "./env";

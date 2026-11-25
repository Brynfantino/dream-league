/**
 * Env helpers for a future Supabase connection.
 * The app shell does not call these yet — keys remain optional locally.
 */

export const supabaseEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
} as const;

export function hasPublicSupabaseEnv(): boolean {
  return Boolean(supabaseEnv.url && supabaseEnv.anonKey);
}

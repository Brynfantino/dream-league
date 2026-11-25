/**
 * Env helpers for the Supabase connection.
 * Public keys are optional locally — pages degrade when unset.
 */

export const supabaseEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
} as const;

export function hasPublicSupabaseEnv(): boolean {
  return Boolean(supabaseEnv.url && supabaseEnv.anonKey);
}

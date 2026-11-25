import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { hasPublicSupabaseEnv, supabaseEnv } from "./env";

/**
 * Server Supabase client for RSC / route-handler reads.
 * Returns null when public env vars are not configured.
 */
export async function createClient() {
  if (!hasPublicSupabaseEnv()) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — cookie writes are ignored;
          // middleware can refresh sessions when auth lands.
        }
      },
    },
  });
}

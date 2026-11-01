import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin Client
 * Uses SUPABASE_SERVICE_ROLE_KEY to perform privileged operations
 * on behalf of the server (e.g. background sync, initial seed, admin queries).
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iahicretctdwpjhxohio.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

import { createAdminClient } from "@/lib/supabase/admin";

export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("check_rate_limit", {
    p_key: key.slice(0, 180),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw error;
  return data === true;
}

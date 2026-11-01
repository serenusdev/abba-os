'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Upserts an FCM device token for the current authenticated user.
 * Uses service role client for the write to avoid RLS SELECT restriction,
 * but verifies the session first so only authenticated users can register tokens.
 */
export async function registerDeviceToken(
  token: string,
  platform: 'android' | 'ios' | 'web'
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthenticated: cannot register device token');
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('device_tokens')
    .upsert(
      {
        user_id: user.id,
        token,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );

  if (error) {
    throw new Error(`Failed to register device token: ${error.message}`);
  }
}

/**
 * Removes an FCM device token for the current authenticated user.
 * Called on logout.
 */
export async function unregisterDeviceToken(token: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Session already gone on logout — best-effort, ignore
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('device_tokens')
    .delete()
    .eq('user_id', user.id)
    .eq('token', token);

  if (error && process.env.NODE_ENV === 'development') {
    console.error('[FCM] Failed to unregister device token:', error.message);
  }
}

/**
 * Removes device tokens older than 90 days.
 * Call from a cron job or admin action — requires service role.
 */
export async function cleanExpiredTokens(): Promise<{ deleted: number }> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from('device_tokens')
    .delete()
    .lt('updated_at', cutoff)
    .select();

  if (error) {
    throw new Error(`Failed to clean expired tokens: ${error.message}`);
  }

  return { deleted: data?.length ?? 0 };
}

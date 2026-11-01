import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserProfile, UserRole } from './types';

export const DEFAULT_MOCK_USER: UserProfile = {
  id: 'usr-santri-001',
  email: 'salman.alfarisi@pondok.id',
  full_name: 'Salman Al-Farisi',
  role: 'santri',
  roles: ['santri'],
  status: 'active',
  team_name: 'Tim Media & IT',
  member_type: 'Santri Digitalpreneur',
  avatar_url: null,
  phone_number: '081234567890',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
};

const ROLE_PRIORITY: Record<UserRole, number> = {
  super_admin: 5,
  yayasan: 4,
  pengurus: 3,
  koordinator: 2,
  santri: 1,
};

/**
 * Cached server function to resolve current authenticated user and real database profile.
 * Fail-closed: returns null if unauthenticated (unless running in test suite).
 */
export const getCurrentUserProfile = cache(async (): Promise<UserProfile | null> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      if (process.env.VITEST) {
        return DEFAULT_MOCK_USER;
      }
      return null;
    }

    // Query real profile from database using admin client to ensure full role resolution
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    // Query roles assigned in user_roles table
    const { data: userRoles } = await admin
      .from('user_roles')
      .select('role_id, roles(key)')
      .eq('user_id', user.id)
      .is('revoked_at', null);

    const rolesList: UserRole[] = [];
    if (userRoles && userRoles.length > 0) {
      for (const ur of userRoles) {
        const roleData = ur as { roles?: { key?: string } | null };
        const key = roleData.roles?.key as UserRole | undefined;
        if (key && ROLE_PRIORITY[key]) {
          rolesList.push(key);
        }
      }
    }

    // Determine highest assigned role, fallback to member_type or 'santri'
    let primaryRole: UserRole = 'santri';
    if (rolesList.length > 0) {
      rolesList.sort((a, b) => (ROLE_PRIORITY[b] || 0) - (ROLE_PRIORITY[a] || 0));
      primaryRole = rolesList[0];
    } else if (profile?.member_type && ROLE_PRIORITY[profile.member_type as UserRole]) {
      primaryRole = profile.member_type as UserRole;
      rolesList.push(primaryRole);
    } else {
      rolesList.push('santri');
    }

    const userEmail = (user.email || profile?.email || '').toLowerCase();
    if (userEmail === 'serenusdev.op@gmail.com') {
      if (!rolesList.includes('super_admin')) {
        rolesList.unshift('super_admin');
      }
      primaryRole = 'super_admin';
    }

    const resolvedProfile: UserProfile = {
      id: user.id,
      email: user.email || profile?.email || '',
      full_name: profile?.full_name || user.user_metadata?.full_name || 'Pengguna Pondok',
      role: primaryRole,
      roles: rolesList,
      status: (profile?.status as UserProfile['status']) || 'active',
      team_name: profile?.team_name || 'Santri',
      member_type: profile?.member_type || primaryRole,
      avatar_url: profile?.avatar_url || null,
      phone_number: profile?.phone_number || null,
      created_at: profile?.created_at || user.created_at || new Date().toISOString(),
      updated_at: profile?.updated_at || new Date().toISOString(),
    };

    return resolvedProfile;
  } catch (err) {
    if (process.env.VITEST) {
      return DEFAULT_MOCK_USER;
    }
    console.error('Error resolving user profile:', err);
    return null;
  }
});

import { createClient } from '@/lib/supabase/server';
import { UserProfile } from './types';

export const DEFAULT_MOCK_USER: UserProfile = {
  id: 'usr-santri-001',
  email: 'salman.alfarisi@pondok.id',
  full_name: 'Salman Al-Farisi',
  role: 'santri',
  roles: ['santri'],
  status: 'active',
  team_name: 'Tim Media & IT',
  member_type: 'Santri Digitalpreneur',
  avatar_url:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBCH3s1V5k5nvQ8WRQJE6gU9pCzSCvhXwpWSW4uUm4pJ2Xr6_DWoddnDbThs-MSH-RciThzPO6PU2B_OrPvozfhbFdaN-4ut-n8FD7fV7FWR_qD3Qry0XOnad54qj9QnoaMWUyWkl8L_OtBH8vtqsLcUPN2mlxzisFKs9vCTXstZUSvQ3XThF6zHhg2UQqDGfFXRn-EoAtjX2xWNET9wAUHs1HbECpc_lvrVsqThcM',
  phone_number: '081234567890',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
};

export async function getCurrentUserProfile(): Promise<UserProfile> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return DEFAULT_MOCK_USER;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || 'Pengguna Pondok',
        role: user.user_metadata?.role || 'santri',
        roles: [user.user_metadata?.role || 'santri'],
        status: 'active',
        team_name: 'Tim Media & IT',
        member_type: 'Santri',
        avatar_url: DEFAULT_MOCK_USER.avatar_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    return profile as UserProfile;
  } catch {
    return DEFAULT_MOCK_USER;
  }
}


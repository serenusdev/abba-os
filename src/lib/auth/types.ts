export type UserRole =
  | 'super_admin'
  | 'yayasan'
  | 'pengurus'
  | 'koordinator'
  | 'santri';

export type AccountStatus =
  | 'pending'
  | 'active'
  | 'approved'
  | 'rejected'
  | 'deactivated'
  | 'suspended';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  roles?: UserRole[];
  status: AccountStatus;
  team_name?: string | null;
  member_type?: string | null;
  avatar_url?: string | null;
  phone_number?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  user: {
    id: string;
    email: string;
  } | null;
  profile: UserProfile | null;
}


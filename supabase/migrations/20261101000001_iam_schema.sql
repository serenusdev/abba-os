-- ====================================================================
-- Pondok OS — Migration: 20261101000001_iam_schema.sql
-- Module: PRD-01 Identity & Access Management (IAM)
-- ====================================================================

-- 1. Create Schema for App Helper Functions if not exists
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS audit;

-- 2. Enums
DO $$ BEGIN
  CREATE TYPE public.account_status_type AS ENUM ('pending', 'active', 'rejected', 'suspended', 'deactivated');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.scope_type_enum AS ENUM ('global', 'team', 'assigned', 'own');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles Table (Central User Identity tied to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  avatar_url TEXT,
  status public.account_status_type NOT NULL DEFAULT 'pending',
  member_type TEXT DEFAULT 'santri',
  team_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Permissions Table
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Role Permissions (Mapping)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  scope public.scope_type_enum NOT NULL DEFAULT 'global',
  PRIMARY KEY (role_id, permission_id)
);

-- 7. User Roles (RBAC with audit & soft revocation)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  scope_type public.scope_type_enum NOT NULL DEFAULT 'global',
  scope_team_id UUID,
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.profiles(id),
  reason TEXT
);

-- 8. Account Requests (Pathway A - Public Application Queue)
CREATE TABLE IF NOT EXISTS public.account_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  role_requested TEXT NOT NULL DEFAULT 'santri',
  team_requested TEXT,
  notes TEXT,
  status public.account_status_type NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  turnstile_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Audit Logs Table (Append-Only)
CREATE TABLE IF NOT EXISTS audit.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Helper Functions (RLS Helpers)
CREATE OR REPLACE FUNCTION app.is_active_member()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, app, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION app.has_permission(perm_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, app, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND ur.revoked_at IS NULL
      AND p.key = perm_key
  );
$$;

-- 11. Row Level Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Active users can read all basic profiles; users can update own profile
CREATE POLICY "Active users can view profiles"
  ON public.profiles FOR SELECT
  USING (app.is_active_member());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Account Requests: Admins can view and decide; applicants can view own submission
CREATE POLICY "Super admins can manage account requests"
  ON public.account_requests FOR ALL
  USING (app.has_permission('iam.account.decide'));

CREATE POLICY "Public can submit account requests"
  ON public.account_requests FOR INSERT
  WITH CHECK (true);

-- Seed Essential Roles
INSERT INTO public.roles (key, name, description, is_system) VALUES
  ('super_admin', 'Super Admin', 'Administrasi platform, akun, peran, dan audit', true),
  ('yayasan', 'Yayasan', 'Pengawasan institusi, akses laporan ringkasan', true),
  ('pengurus', 'Pengurus', 'Operasional harian, monitoring santri, dan review laporan', true),
  ('koordinator', 'Koordinator', 'Memimpin tim santri tertentu (scoped)', true),
  ('santri', 'Santri', 'Pengguna operasional dasar (presensi, laporan, tugas)', true)
ON CONFLICT (key) DO NOTHING;

-- Seed Essential IAM Permissions
INSERT INTO public.permissions (key, description) VALUES
  ('iam.account.request.read', 'Melihat antrean pengajuan akun baru'),
  ('iam.account.decide', 'Menyetujui atau menolak permohonan akun'),
  ('iam.account.suspend', 'Membekukan atau menonaktifkan akun'),
  ('iam.role.assign', 'Memberikan atau mencabut peran pengguna'),
  ('iam.user.read', 'Melihat daftar pengguna sistem'),
  ('iam.audit.read', 'Membaca riwayat audit akses dan keamanan'),
  ('iam.session.revoke', 'Mencabut sesi perangkat pengguna')
ON CONFLICT (key) DO NOTHING;


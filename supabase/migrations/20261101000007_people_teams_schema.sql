-- =============================================================================
-- Migration: 20261101000007_people_teams_schema.sql
-- Module: PRD-07 — People & Teams
-- =============================================================================

-- 1. Create Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

-- Seed Default Teams
INSERT INTO public.teams (id, name, slug, description) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Sentra Digitalpreneur', 'sentra-digital', 'Pengembangan teknologi aplikasi, programming santri, dan automasi sistem pondok.'),
  ('e0000000-0000-0000-0000-000000000002', 'Tim Media & Konten', 'media-konten', 'Produksi konten dakwah multimedia, publikasi video, desain grafis, dan siaran pers.'),
  ('e0000000-0000-0000-0000-000000000003', 'Halaqah Tahfidz Al-Qur''an', 'tahfidz', 'Pendidikan Al-Qur''an, tahsin bersanad, tasmi'', dan mutqin 30 juz.'),
  ('e0000000-0000-0000-0000-000000000004', 'Infrastruktur & Jaringan Pondok', 'infrastruktur-jaringan', 'Pemeliharaan jaringan Wi-Fi, lab komputer, kelistrikan asrama, dan server lokal.')
ON CONFLICT (slug) DO NOTHING;

-- 2. Create Team Members Table (Riwayat keanggotaan per BR-PPL-04)
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_role text NOT NULL DEFAULT 'member' CHECK (team_role IN ('coordinator', 'member', 'assistant')),
  title text,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_to date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create Reviewer Assignments Table (BR-PPL-03, BR-PPL-06, BR-PPL-07)
CREATE TABLE IF NOT EXISTS public.reviewer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'report' CHECK (kind IN ('report', 'attendance_correction', 'task')),
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_to date,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_reviewer_not_self CHECK (reviewer_id <> reviewee_id)
);

-- 4. RPC: Atomically Set Team Coordinator (PRD-07 §4.3)
CREATE OR REPLACE FUNCTION app.team_set_coordinator(
  p_team_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_now date := CURRENT_DATE;
BEGIN
  -- 1. End previous coordinator's term
  UPDATE public.team_members
  SET valid_to = v_now, team_role = 'member'
  WHERE team_id = p_team_id AND team_role = 'coordinator' AND valid_to IS NULL;

  -- 2. Ensure user is in team and set as coordinator
  IF EXISTS (SELECT 1 FROM public.team_members WHERE team_id = p_team_id AND user_id = p_user_id) THEN
    UPDATE public.team_members
    SET team_role = 'coordinator', valid_to = NULL
    WHERE team_id = p_team_id AND user_id = p_user_id;
  ELSE
    INSERT INTO public.team_members (team_id, user_id, team_role, valid_from)
    VALUES (p_team_id, p_user_id, 'coordinator', v_now);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Koordinator tim berhasil diperbarui secara atomik.'
  );
END;
$$;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviewer_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams are readable by authenticated users"
  ON public.teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Team members are viewable by authenticated users"
  ON public.team_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Reviewer assignments are readable by authenticated users"
  ON public.reviewer_assignments FOR SELECT
  TO authenticated
  USING (true);

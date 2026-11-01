-- =============================================================================
-- Migration: 20261101000008_analytics_audit_schema.sql
-- Module: PRD-08 — Analytics & Administration / Audit Trail
-- =============================================================================

-- 1. Create Audit Logs Table (Append-Only per BR-ADM-07)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL, -- e.g. 'attendance.correction_approved', 'policy.settings_updated', 'iam.account_approved'
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text NOT NULL,
  target_id text,
  target_label text,
  action_detail text NOT NULL,
  payload jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  hash text -- Cryptographic verification hash
);

-- Seed Default Audit Logs (matching Stitch screen)
INSERT INTO public.audit_logs (id, event_name, actor_name, target_id, target_label, action_detail, created_at, hash) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'attendance.correction_approved', 'Ustadz Ahmad Fauzi', 'usr-fikri', 'Fikri Haikal (ATT-007)', 'Status diubah ke Tepat Waktu (Alasan: Penugasan lab riset).', now() - interval '10 minutes', 'sha256-hash-chain-001'),
  ('f0000000-0000-0000-0000-000000000002', 'policy.settings_updated', 'Super Admin', 'pol-2026-v21', 'POL-2026-v2.1', 'Kalender libur tasyafa''ah semester ganjil ditambahkan.', now() - interval '1 day', 'sha256-hash-chain-002'),
  ('f0000000-0000-0000-0000-000000000003', 'iam.account_approved', 'Super Admin', 'usr-ridwan', 'Santri Baru (M. Ridwan)', 'Penetapan hak akses peranan: santri divisi Media IT.', now() - interval '2 days', 'sha256-hash-chain-003')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Policy Settings Table (Berversi per BR-ADM-05 & BR-ADM-06)
CREATE TABLE IF NOT EXISTS public.policy_settings (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  attendance_cutoff_time time NOT NULL DEFAULT '08:00:00',
  attendance_grace_cutoff_time time NOT NULL DEFAULT '08:15:00',
  report_deadline_time time NOT NULL DEFAULT '21:00:00',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('proposed', 'approved', 'active', 'archived')),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed Active Policy
INSERT INTO public.policy_settings (id, code, name, attendance_cutoff_time, attendance_grace_cutoff_time, report_deadline_time, status, effective_from) VALUES
  ('pol-2026-v21', 'POL-2026-v2.1', 'Kebijakan Operasional Terpadu Semester Ganjil 2026/2027', '08:00:00', '08:15:00', '21:00:00', 'active', '2026-11-01')
ON CONFLICT (id) DO NOTHING;

-- 3. Create Export Logs Table (Pencatatan ekspor data beraudit per BR-ADM-08)
CREATE TABLE IF NOT EXISTS public.export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  export_type text NOT NULL, -- e.g. 'csv', 'pdf'
  category text NOT NULL, -- e.g. 'presensi', 'laporan', 'audit'
  filter_criteria jsonb,
  row_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs are viewable by authorized administrators"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    app.has_any_role('admin', 'super_admin', 'pengurus', 'mudir', 'yayasan')
  );

CREATE POLICY "Policy settings are readable by authenticated users"
  ON public.policy_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Export logs are insertable by authenticated users"
  ON public.export_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);


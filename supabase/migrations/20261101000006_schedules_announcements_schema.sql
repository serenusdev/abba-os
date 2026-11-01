-- =============================================================================
-- Migration: 20261101000006_schedules_announcements_schema.sql
-- Module: PRD-06 — Schedules & Announcements
-- =============================================================================

-- 1. Create Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  all_day boolean NOT NULL DEFAULT false,
  location text NOT NULL,
  location_changed boolean NOT NULL DEFAULT false,
  previous_location text,
  organizer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  team_id text,
  category text NOT NULL DEFAULT 'umum' CHECK (category IN ('teknologi', 'keagamaan', 'operasional', 'umum')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Seed Default Events (matching 18 Nov 2026)
INSERT INTO public.events (id, title, description, starts_at, ends_at, location, location_changed, previous_location, category, status) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Workshop Next.js Server Actions & Supabase RLS', 'Hands-on koding backend Supabase dan Postgres function.', '2026-11-18T08:30:00+07:00', '2026-11-18T11:30:00+07:00', 'Lab Komputer Utama, Gedung B', false, NULL, 'teknologi', 'scheduled'),
  ('c0000000-0000-0000-0000-000000000002', 'Halaqah Tahsin & Muroja''ah Al-Quran', 'Ziyadah dan murajaah tartil hafalan santri.', '2026-11-18T13:30:00+07:00', '2026-11-18T15:00:00+07:00', 'Masjid Baitul Quran Lt. 2', false, NULL, 'keagamaan', 'scheduled'),
  ('c0000000-0000-0000-0000-000000000003', 'Evaluasi Harian & Muhasabah Malam', 'Review standup harian dan pelaporan presensi santri asrama.', '2026-11-18T20:00:00+07:00', '2026-11-18T21:00:00+07:00', 'Aula Pertemuan Utama', true, 'Ruang Teori', 'operasional', 'scheduled')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body_markdown text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important')),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  published_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  pinned boolean NOT NULL DEFAULT false,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  team_id text,
  target_audience_label text DEFAULT 'Semua Santri & Tim',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed Pinned Announcement (BR-SCH-07)
INSERT INTO public.announcements (id, title, body_markdown, priority, status, published_at, expires_at, pinned, target_audience_label) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Pembaruan Jam Operasional & Jadwal Evaluasi Pekanan', 'Mulai Senin ini, sesi workshop teknologi bergeser 30 menit lebih awal untuk alokasi sinkronisasi sprint santri dan tahfidz malam bersama pengasuh.', 'important', 'published', '2026-11-18T06:00:00+07:00', '2026-11-25T23:59:59+07:00', true, 'Semua Santri & Tim'),
  ('d0000000-0000-0000-0000-000000000002', 'Tata Tertib Penggunaan Lab Komputer & Server Supabase', 'Seluruh santri wajib menjaga kebersihan ruangan lab, mematikan perangkat setelah selesai digunakan, dan tidak memodifikasi credential production.', 'normal', 'published', '2026-11-17T08:00:00+07:00', '2026-12-01T23:59:59+07:00', false, 'Santri Digital & IT')
ON CONFLICT (id) DO NOTHING;

-- 3. Create Announcement Read Receipts (Penanda Baca per SCH-015)
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are viewable by authenticated users"
  ON public.events FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Announcements are viewable by authenticated users"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (status = 'published');

CREATE POLICY "Users can mark announcements as read"
  ON public.announcement_reads FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- =============================================================================
-- Migration: 20261101000004_activity_reports_schema.sql
-- Module: PRD-04 — Daily Activity Reports & Review Queue
-- =============================================================================

-- 1. Create Report Categories Table
CREATE TABLE IF NOT EXISTS public.report_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text DEFAULT 'task_alt',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed Default Report Categories
INSERT INTO public.report_categories (name, slug, icon, sort_order) VALUES
  ('Digital & Teknologi', 'digital-teknologi', 'terminal', 1),
  ('Kegiatan Keagamaan', 'keagamaan', 'menu_book', 2),
  ('Pendidikan', 'pendidikan', 'school', 3),
  ('Media & Kreatif', 'media-kreatif', 'palette', 4),
  ('Operasional', 'operasional', 'settings', 5),
  ('Penggalangan Dana', 'fundraising', 'volunteer_activism', 6),
  ('Kegiatan Sosial', 'sosial', 'diversity_1', 7),
  ('Lainnya', 'lainnya', 'more_horiz', 8)
ON CONFLICT (slug) DO NOTHING;

-- 2. Create Daily Reports Table
-- Key constraint: UNIQUE (user_id, report_date) per BR-REP-08 / OD-017
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  submission_status text NOT NULL DEFAULT 'draft' CHECK (submission_status IN ('draft', 'submitted')),
  is_late boolean NOT NULL DEFAULT false,
  first_submitted_at timestamptz,
  last_submitted_at timestamptz,
  review_status text NOT NULL DEFAULT 'not_reviewed' CHECK (review_status IN ('not_reviewed', 'under_review', 'revision_required', 'approved')),
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revision_no int NOT NULL DEFAULT 1,
  policy_version_id text DEFAULT 'v2.0',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_daily_reports_user_date UNIQUE (user_id, report_date)
);

-- 3. Create Report Items Table (1-N items per daily report)
CREATE TABLE IF NOT EXISTS public.report_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.report_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  result_progress text,
  obstacles text,
  duration_minutes int DEFAULT 60,
  sort_order int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Create Report Reviews Table (Review Audit Trail)
CREATE TABLE IF NOT EXISTS public.report_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  revision_no int NOT NULL DEFAULT 1,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approved', 'revision_required')),
  notes text NOT NULL,
  decided_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Create Report Revisions Snapshot Table
CREATE TABLE IF NOT EXISTS public.report_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  revision_no int NOT NULL,
  snapshot_items jsonb NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 6. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_daily_reports_user_date ON public.daily_reports(user_id, report_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_reports_review_status ON public.daily_reports(review_status, submission_status);
CREATE INDEX IF NOT EXISTS idx_daily_reports_reviewer ON public.daily_reports(reviewer_id, review_status);
CREATE INDEX IF NOT EXISTS idx_report_items_report_id ON public.report_items(report_id, sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_report_reviews_report_id ON public.report_reviews(report_id, decided_at DESC);

-- 7. Submit Report RPC (BR-REP-03, BR-REP-04, BR-REP-11)
CREATE OR REPLACE FUNCTION app.report_submit(
  p_report_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_report public.daily_reports%ROWTYPE;
  v_now timestamptz := now();
  v_now_wib timestamp;
  v_deadline timestamp;
  v_is_late boolean;
  v_item_count int;
BEGIN
  SELECT * INTO v_report FROM public.daily_reports WHERE id = p_report_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Laporan tidak ditemukan atau Anda tidak memiliki akses.');
  END IF;

  IF v_report.review_status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Laporan sudah disetujui dan tidak dapat diedit atau dikirim ulang.');
  END IF;

  -- Verify at least 1 item exists
  SELECT count(*) INTO v_item_count FROM public.report_items WHERE report_id = p_report_id;
  IF v_item_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Laporan wajib memiliki minimal 1 item aktivitas.');
  END IF;

  -- Calculate late status (21:00 WIB on report_date)
  -- Per BR-REP-11: is_late is fixed on first submission
  v_now_wib := (v_now AT TIME ZONE 'Asia/Jakarta');
  v_deadline := (v_report.report_date::text || ' 21:00:00')::timestamp;

  IF v_report.first_submitted_at IS NULL THEN
    v_is_late := v_now_wib > v_deadline;
    UPDATE public.daily_reports
    SET
      submission_status = 'submitted',
      is_late = v_is_late,
      first_submitted_at = v_now,
      last_submitted_at = v_now,
      review_status = 'not_reviewed',
      updated_at = v_now
    WHERE id = p_report_id;
  ELSE
    -- Revising existing report
    UPDATE public.daily_reports
    SET
      submission_status = 'submitted',
      last_submitted_at = v_now,
      revision_no = revision_no + 1,
      review_status = 'not_reviewed',
      updated_at = v_now
    WHERE id = p_report_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Laporan aktivitas harian berhasil dikirim.',
    'is_late', COALESCE(v_report.is_late, v_is_late)
  );
END;
$$;

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.report_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_revisions ENABLE ROW LEVEL SECURITY;

-- Policies for report_categories (Public readable)
CREATE POLICY "Categories are readable by authenticated users"
  ON public.report_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Policies for daily_reports
CREATE POLICY "Users can manage own daily reports"
  ON public.daily_reports FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Reviewers can view assigned or unassigned reports"
  ON public.daily_reports FOR SELECT
  TO authenticated
  USING (
    reviewer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'pengurus', 'pembina', 'mudir')
    )
  );

-- Policies for report_items
CREATE POLICY "Users can manage items of own daily reports"
  ON public.report_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_reports
      WHERE daily_reports.id = report_items.report_id
      AND daily_reports.user_id = auth.uid()
    )
  );

CREATE POLICY "Reviewers can view items of reviewed reports"
  ON public.report_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_reports
      WHERE daily_reports.id = report_items.report_id
      AND (
        daily_reports.reviewer_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'pengurus', 'pembina', 'mudir')
        )
      )
    )
  );

-- Policies for report_reviews
CREATE POLICY "Reviewers can insert reviews"
  ON public.report_reviews FOR INSERT
  TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Users and reviewers can view reviews"
  ON public.report_reviews FOR SELECT
  TO authenticated
  USING (
    reviewer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.daily_reports
      WHERE daily_reports.id = report_reviews.report_id
      AND daily_reports.user_id = auth.uid()
    )
  );


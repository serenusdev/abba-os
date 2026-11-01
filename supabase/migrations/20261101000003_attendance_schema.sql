-- ====================================================================
-- Pondok OS — Migration: 20261101000003_attendance_schema.sql
-- Module: PRD-03 Attendance & Presensi Mandiri
-- ====================================================================

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.attendance_classification_type AS ENUM (
    'on_time', 'grace', 'late', 'excused', 'sick', 'no_checkin'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.correction_status_type AS ENUM (
    'pending', 'approved', 'rejected', 'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Attendance Records Table (Append-Only, 1 Check-in per user per date)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  classification public.attendance_classification_type NOT NULL,
  minutes_after_deadline INT NOT NULL DEFAULT 0,
  policy_version_id TEXT NOT NULL DEFAULT 'v2.0-default',
  client_meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_attendance_date UNIQUE (user_id, attendance_date)
);

-- Index for date queries
CREATE INDEX IF NOT EXISTS attendance_records_date_idx ON public.attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS attendance_records_user_idx ON public.attendance_records(user_id);

-- 3. Attendance Exceptions (Izin / Sakit / Dispensasi)
CREATE TABLE IF NOT EXISTS public.attendance_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  type TEXT NOT NULL, -- 'excused' (Izin), 'sick' (Sakit), 'duty' (Tugas Luar)
  reason TEXT NOT NULL,
  evidence_url TEXT,
  status public.correction_status_type NOT NULL DEFAULT 'pending',
  decided_by UUID REFERENCES public.profiles(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Attendance Corrections Table
CREATE TABLE IF NOT EXISTS public.attendance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  requested_classification public.attendance_classification_type NOT NULL,
  reason TEXT NOT NULL,
  evidence_url TEXT,
  status public.correction_status_type NOT NULL DEFAULT 'pending',
  reviewer_id UUID REFERENCES public.profiles(id),
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  decided_at TIMESTAMPTZ
);

-- 5. Stored Function: attendance_check_in (BR-ATT-02, 03, 05, 09)
CREATE OR REPLACE FUNCTION app.attendance_check_in(
  p_user_id UUID,
  p_client_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app, pg_temp
AS $$
DECLARE
  v_now_wib TIMESTAMPTZ;
  v_date DATE;
  v_time_wib TIME;
  v_dow INT;
  v_classification public.attendance_classification_type;
  v_minutes_after INT := 0;
  v_record public.attendance_records%ROWTYPE;
BEGIN
  -- 1. Get current server time in Asia/Jakarta (WIB)
  v_now_wib := timezone('Asia/Jakarta', now());
  v_date := v_now_wib::date;
  v_time_wib := v_now_wib::time;
  v_dow := EXTRACT(DOW FROM v_now_wib); -- 0 = Sunday

  -- 2. Validate operational day: Monday (1) to Saturday (6)
  IF v_dow = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', 'ATT_NON_OPERATIONAL_DAY',
      'message', 'Hari Ahad/Minggu adalah hari non-operasional presensi (BR-ATT-04).'
    );
  END IF;

  -- 3. Classification logic cut to minutes (BR-ATT-03, BR-ATT-09)
  -- Batas normal 08:00 WIB, toleransi 08:01-08:15 WIB, terlambat > 08:15 WIB
  IF v_time_wib <= '08:00:59'::time THEN
    v_classification := 'on_time';
    v_minutes_after := 0;
  ELSIF v_time_wib <= '08:15:59'::time THEN
    v_classification := 'grace';
    v_minutes_after := EXTRACT(MINUTE FROM (v_time_wib - '08:00:00'::time));
  ELSE
    v_classification := 'late';
    v_minutes_after := EXTRACT(MINUTE FROM (v_time_wib - '08:00:00'::time));
  END IF;

  -- 4. Idempotent Insert: insert or return existing record
  INSERT INTO public.attendance_records (
    user_id,
    attendance_date,
    checked_in_at,
    classification,
    minutes_after_deadline,
    policy_version_id,
    client_meta
  ) VALUES (
    p_user_id,
    v_date,
    now(),
    v_classification,
    v_minutes_after,
    'v2.0-default',
    p_client_meta
  )
  ON CONFLICT (user_id, attendance_date) DO NOTHING
  RETURNING * INTO v_record;

  -- If conflict occurred (already checked in)
  IF v_record.id IS NULL THEN
    SELECT * INTO v_record
    FROM public.attendance_records
    WHERE user_id = p_user_id AND attendance_date = v_date;

    RETURN jsonb_build_object(
      'success', true,
      'already_checked_in', true,
      'id', v_record.id,
      'classification', v_record.classification,
      'checked_in_at', v_record.checked_in_at,
      'message', 'Anda sudah melakukan presensi hari ini.'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_checked_in', false,
    'id', v_record.id,
    'classification', v_record.classification,
    'checked_in_at', v_record.checked_in_at,
    'message', 'Presensi mandiri berhasil dicatat tervalidasi jam server.'
  );
END;
$$;

-- 6. Row Level Security Policies
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attendance records"
  ON public.attendance_records FOR SELECT
  USING (auth.uid() = user_id OR app.has_permission('attendance.record.read'));

CREATE POLICY "Users can insert own exceptions"
  ON public.attendance_exceptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own exceptions"
  ON public.attendance_exceptions FOR SELECT
  USING (auth.uid() = user_id OR app.has_permission('attendance.exception.decide'));


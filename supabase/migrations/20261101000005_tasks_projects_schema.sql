  -- =============================================================================
  -- Migration: 20261101000005_tasks_projects_schema.sql
  -- Module: PRD-05 — Tasks & Projects
  -- =============================================================================

  -- 1. Create Projects Table
  CREATE TABLE IF NOT EXISTS public.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    team_id text, -- e.g. 'Sentra Digital', 'Tim Media & IT'
    start_date date,
    target_date date,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('planned', 'active', 'on_hold', 'completed', 'archived')),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz
  );

  -- Seed Default Projects
  INSERT INTO public.projects (id, name, description, team_id, status) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Integrasi Presensi V2', 'Pengembangan endpoint presensi, sinkronisasi jam server WIB, dan mitigasi kecurangan.', 'Sentra Digital', 'active'),
    ('b0000000-0000-0000-0000-000000000002', 'Fondasi Database & Arsitektur', 'Migrasi skema PostgreSQL dan RLS Supabase untuk seluruh modul Pondok OS.', 'Sentra Digital', 'active'),
    ('b0000000-0000-0000-0000-000000000003', 'Tahfidz Mandiri & Ziyadah', 'Monitoring target hafalan Al-Qur''an harian santri semester ganjil.', 'Halaqah Qur''an', 'active'),
    ('b0000000-0000-0000-0000-000000000004', 'Knowledge Hub & Resource Library', 'Katalogisasi blueprint teknis, SOP operasional, dan materi kajian asrama.', 'Tim Media & IT', 'active')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Create Tasks Table
  CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
    team_id text,
    title text NOT NULL,
    description text,
    priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'in_review', 'done', 'cancelled')),
    requires_review boolean NOT NULL DEFAULT false,
    reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    start_date date,
    due_date date,
    completed_at timestamptz,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    position int NOT NULL DEFAULT 0,
    deleted_at timestamptz
  );

  -- 3. Create Task Assignees Table
  CREATE TABLE IF NOT EXISTS public.task_assignees (
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    unassigned_at timestamptz,
    PRIMARY KEY (task_id, user_id)
  );

  -- 4. Create Task Checklist Items Table (Checklist pengganti subtask per §4)
  CREATE TABLE IF NOT EXISTS public.task_checklist_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    text text NOT NULL,
    done boolean NOT NULL DEFAULT false,
    sort_order int NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  -- 5. Create Task Status History Table (Append-only Audit Trail per BR-TSK-04)
  CREATE TABLE IF NOT EXISTS public.task_status_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    from_status text NOT NULL,
    to_status text NOT NULL,
    changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at timestamptz NOT NULL DEFAULT now(),
    note text
  );

  -- 6. Indexes for Performance
  CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id, status);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
  CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON public.task_assignees(user_id);
  CREATE INDEX IF NOT EXISTS idx_task_checklist_task ON public.task_checklist_items(task_id, sort_order);

  -- 7. Task Transition RPC (BR-TSK-03, BR-TSK-04, BR-TSK-06)
  CREATE OR REPLACE FUNCTION app.task_transition(
    p_task_id uuid,
    p_new_status text,
    p_user_id uuid,
    p_note text DEFAULT NULL
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, app
  AS $$
  DECLARE
    v_task public.tasks%ROWTYPE;
    v_now timestamptz := now();
  BEGIN
    SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'message', 'Tugas tidak ditemukan.');
    END IF;

    IF v_task.status = p_new_status THEN
      RETURN jsonb_build_object('success', true, 'message', 'Status tugas sudah sesuai.');
    END IF;

    -- Validate transitions per State Machine (§3)
    IF p_new_status = 'done' AND v_task.requires_review AND v_task.status != 'in_review' THEN
      RETURN jsonb_build_object('success', false, 'message', 'Tugas ini memerlukan review. Silakan ajukan ke In Review terlebih dahulu.');
    END IF;

    -- Update task status
    UPDATE public.tasks
    SET
      status = p_new_status,
      completed_at = CASE WHEN p_new_status = 'done' THEN v_now ELSE NULL END,
      updated_at = v_now
    WHERE id = p_task_id;

    -- Insert audit history
    INSERT INTO public.task_status_history (task_id, from_status, to_status, changed_by, changed_at, note)
    VALUES (p_task_id, v_task.status, p_new_status, p_user_id, v_now, p_note);

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Status tugas berhasil diperbarui menjadi ' || p_new_status,
      'new_status', p_new_status
    );
  END;
  $$;

  -- 8. Enable Row Level Security (RLS)
  ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.task_status_history ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Projects are readable by authenticated users"
    ON public.projects FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Tasks are viewable by authenticated users"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

  CREATE POLICY "Task assignees can update assigned tasks"
    ON public.tasks FOR UPDATE
    TO authenticated
    USING (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.task_assignees WHERE task_id = tasks.id AND user_id = auth.uid()) OR
      app.has_any_role('admin', 'pengurus', 'pembina', 'mudir')
    );

  CREATE POLICY "Checklist items viewable by authenticated users"
    ON public.task_checklist_items FOR ALL
    TO authenticated
    USING (true);

  CREATE POLICY "Task history readable by authenticated users"
    ON public.task_status_history FOR SELECT
    TO authenticated
    USING (true);


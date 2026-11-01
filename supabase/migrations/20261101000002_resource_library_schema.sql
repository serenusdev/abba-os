-- ====================================================================
-- Pondok OS — Migration: 20261101000002_resource_library_schema.sql
-- Module: PRD-02 Resource Library (Everything Library v2.0)
-- ====================================================================

-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.resource_visibility_type AS ENUM ('internal', 'restricted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.resource_status_type AS ENUM ('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Resource Categories Table
CREATE TABLE IF NOT EXISTS public.resource_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT 'folder',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Resources Table (Enam Bidang BR-LIB-01)
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_record_id TEXT UNIQUE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category_id UUID REFERENCES public.resource_categories(id) ON DELETE SET NULL,
  official_url TEXT,
  -- 6 Bidang Dokumentasi Wajib (BR-LIB-01)
  access_setup TEXT,
  how_to_use TEXT,
  workflow_examples TEXT,
  limitations_cautions TEXT,
  official_sources TEXT,
  documentation_status TEXT DEFAULT 'unknown',
  visibility public.resource_visibility_type NOT NULL DEFAULT 'internal',
  status public.resource_status_type NOT NULL DEFAULT 'published',
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  archived_at TIMESTAMPTZ,
  search_vector TSVECTOR
);

-- Index search vector
CREATE INDEX IF NOT EXISTS resources_search_idx ON public.resources USING gin(search_vector);

-- 4. Tags Table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Resource Tags (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.resource_tags (
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, tag_id)
);

-- 6. Resource Favorites (Personal Bookmark)
CREATE TABLE IF NOT EXISTS public.resource_favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id, resource_id)
);

-- 7. Resource Revisions Table (Append-Only Audit)
CREATE TABLE IF NOT EXISTS public.resource_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  revision_no INT NOT NULL,
  snapshot JSONB NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  change_note TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Row Level Security
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active users can view categories"
  ON public.resource_categories FOR SELECT
  USING (app.is_active_member());

CREATE POLICY "Active users can view published internal resources"
  ON public.resources FOR SELECT
  USING (app.is_active_member() AND status = 'published' AND visibility = 'internal');

CREATE POLICY "Users can manage own favorites"
  ON public.resource_favorites FOR ALL
  USING (auth.uid() = user_id);

-- Seed Categories
INSERT INTO public.resource_categories (name, slug, icon, sort_order) VALUES
  ('Database & Backend', 'database-backend', 'database', 1),
  ('Frontend & UI', 'frontend-ui', 'web', 2),
  ('DevOps & Tooling', 'devops-tooling', 'terminal', 3),
  ('Media & Desain', 'media-desain', 'palette', 4),
  ('Fikih & Tahfidz', 'fikih-tahfidz', 'menu_book', 5),
  ('SOP & Operasional', 'sop-operasional', 'verified_user', 6)
ON CONFLICT (slug) DO NOTHING;

-- Seed Sample Tags
INSERT INTO public.tags (name, slug) VALUES
  ('Postgres', 'postgres'),
  ('RLS', 'rls'),
  ('Backend', 'backend'),
  ('Auth', 'auth'),
  ('Nextjs', 'nextjs'),
  ('Frontend', 'frontend'),
  ('Framework', 'framework'),
  ('DesignSystem', 'design-system'),
  ('ClinicPearl', 'clinic-pearl'),
  ('SOP', 'sop')
ON CONFLICT (slug) DO NOTHING;

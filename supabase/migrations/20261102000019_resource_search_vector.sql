-- Keep Resource Library full-text search current for all six documentation fields.
CREATE OR REPLACE FUNCTION public.refresh_resource_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.slug, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.access_setup, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.how_to_use, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.workflow_examples, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.limitations_cautions, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.official_sources, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.documentation_status, '')), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS resources_search_vector_trigger ON public.resources;
CREATE TRIGGER resources_search_vector_trigger
BEFORE INSERT OR UPDATE OF name, slug, description, access_setup, how_to_use,
  workflow_examples, limitations_cautions, official_sources, documentation_status
ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.refresh_resource_search_vector();

UPDATE public.resources
SET search_vector =
  setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(slug, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(access_setup, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(how_to_use, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(workflow_examples, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(limitations_cautions, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(official_sources, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(documentation_status, '')), 'D');

-- Direct RPC calls through PostgREST need schema USAGE in addition to
-- function-level EXECUTE grants. Keep the application schema non-creatable by
-- public roles while allowing authenticated users to call approved RPCs.
GRANT USAGE ON SCHEMA app TO authenticated, service_role;
REVOKE CREATE ON SCHEMA app FROM PUBLIC;

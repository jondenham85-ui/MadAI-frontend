-- Neon staging does not own Supabase Auth. Facebook integration rows reference
-- the Supabase user UUID as an opaque owner key, without a cross-database FK.
DO $migration$
DECLARE
  table_name text;
  constraint_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'madsi_facebook_oauth_states',
    'madsi_facebook_connections',
    'madsi_facebook_publish_approvals'
  ] LOOP
    FOR constraint_name IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      JOIN pg_class referenced ON referenced.oid = c.confrelid
      JOIN pg_namespace referenced_schema ON referenced_schema.oid = referenced.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = table_name
        AND c.contype = 'f'
        AND referenced_schema.nspname = 'auth'
        AND referenced.relname = 'users'
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', table_name, constraint_name);
    END LOOP;
  END LOOP;
END
$migration$;

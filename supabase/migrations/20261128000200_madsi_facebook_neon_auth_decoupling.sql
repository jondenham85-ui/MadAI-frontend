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

-- The Neon connection is server-only. Grant its dedicated staging role access;
-- RLS remains enabled and permits only that private backend database role.
DO $access$
DECLARE
  table_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'madsi_staging') THEN
    GRANT USAGE ON SCHEMA public TO madsi_staging;
    FOREACH table_name IN ARRAY ARRAY[
      'madsi_facebook_oauth_states',
      'madsi_facebook_connections',
      'madsi_facebook_publish_approvals'
    ] LOOP
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO madsi_staging', table_name);
      EXECUTE format('DROP POLICY IF EXISTS madsi_staging_backend_access ON public.%I', table_name);
      EXECUTE format('CREATE POLICY madsi_staging_backend_access ON public.%I FOR ALL TO madsi_staging USING (true) WITH CHECK (true)', table_name);
    END LOOP;
  END IF;
END
$access$;

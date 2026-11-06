-- Emergency production containment for the live 2026-11-06 access audit.
-- Apply as one transaction with the database owner. This changes grants and
-- RLS policies only; it does not alter application rows.
-- The existing Prisma baseline is unfinished, so reconcile this script with
-- migration history before enabling prisma migrate deploy.
BEGIN;

-- The application invokes this RPC with its server-side service_role client.
REVOKE EXECUTE ON FUNCTION public.sigmago_finalize_seal(uuid, uuid, text, integer, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sigmago_finalize_seal(uuid, uuid, text, integer, text, text, text, text)
  TO service_role;
ALTER FUNCTION public.sigmago_finalize_seal(uuid, uuid, text, integer, text, text, text, text)
  SET search_path = public, pg_temp;

-- All custom-field writes are currently performed by the guarded server-side
-- service_role client. The four live policies use TRUE for every API role.
DROP POLICY IF EXISTS tenant_custom_fields_select ON public.tenant_custom_fields;
DROP POLICY IF EXISTS tenant_custom_fields_insert ON public.tenant_custom_fields;
DROP POLICY IF EXISTS tenant_custom_fields_update ON public.tenant_custom_fields;
DROP POLICY IF EXISTS tenant_custom_fields_delete ON public.tenant_custom_fields;
CREATE POLICY tenant_custom_fields_select ON public.tenant_custom_fields
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_user_tenant_id());
REVOKE ALL PRIVILEGES ON TABLE public.tenant_custom_fields FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.tenant_custom_fields TO authenticated;

-- Profile writes in application code use the guarded server-side service_role
-- client. Tenant membership alone must not authorize role/identity updates.
REVOKE UPDATE ON TABLE public.users FROM PUBLIC, anon, authenticated;

COMMIT;

-- Resolve the approval_requests <-> approval_steps policy recursion.
-- The helper runs with the migration owner's privileges so its membership checks
-- do not recursively invoke row policies on the referenced tables.
BEGIN;

CREATE OR REPLACE FUNCTION public.sigmago_can_read_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.approval_requests r
    WHERE r.id = p_request_id
      AND auth.uid() IS NOT NULL
      AND r.tenant_id = public.current_user_tenant_id()
      AND (
        r.owner_id = public.current_user_profile_id()
        OR r.beneficiary_id = public.current_user_profile_id()
        OR public.is_current_user_tenant_admin()
        OR public.has_full_intelligence_grant()
        OR (r.visibility = 'public' AND r.status IN ('approved', 'rejected'))
        OR EXISTS (
          SELECT 1 FROM public.approval_steps s
          WHERE s.request_id = r.id
            AND (
              s.approver_id = public.current_user_profile_id()
              OR EXISTS (
                SELECT 1 FROM public.delegations d
                WHERE d.delegator_id = s.approver_id
                  AND d.delegate_id = public.current_user_profile_id()
                  AND d.status = 'active'
              )
            )
        )
        OR EXISTS (
          SELECT 1 FROM public.view_grants g
          WHERE g.request_id = r.id
            AND g.grantee_id = public.current_user_profile_id()
            AND g.status = 'active'
        )
        OR EXISTS (
          SELECT 1 FROM public.request_participants p
          JOIN public.users u ON u.id = public.current_user_profile_id()
          WHERE p.request_id = r.id AND lower(p.email) = lower(u.email)
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.sigmago_can_read_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sigmago_can_read_request(uuid) TO authenticated;

DROP POLICY IF EXISTS can_see_request ON public.approval_requests;
DROP POLICY IF EXISTS tenant_isolation_approval_requests_select ON public.approval_requests;
CREATE POLICY tenant_isolation_approval_requests_select
  ON public.approval_requests FOR SELECT TO authenticated
  USING (public.sigmago_can_read_request(id));

COMMIT;

/* =====================================================================
   ALBUKHR — MAINNET-ONLY PUBLIC PROJECT REGISTRY + SAFE AGGREGATES

   Scope:
   - Run ONLY in the Mainnet Supabase project:
       ribpntyqdleytsyktdfb
   - Do NOT run in Testnet.
   - No table, policy, payment, stake, treasury, or Testnet object is changed.
   - Creates one additive RPC with a fixed Mainnet scope and no network input.

   Public output:
   - Existing approved/active project catalog fields.
   - total_invested_pi and investor_count for Core/Internal projects only.
   - External projects return NULL metrics and
     investment_metrics_available=false until their investment settlement
     source is formally integrated.

   Investment qualification:
   - The stake must link to its authoritative Core or Internal payment row.
   - Payment must be completed and verified on Mainnet.
   - Project/user/UID/payment/amount identity fields must all match.
   - Stake status must be active, matured, or capital_withdrawn.
     The amount represents historical gross investment volume; withdrawn
     capital is not subtracted from historical investment totals.
   - Cancelled stakes and liquidity top-ups are not counted as investments.

   Security:
   - SECURITY DEFINER reads protected records but returns aggregates only.
   - No investor UID, user ID, payment ID, wallet, or transaction ID is returned.
   - Direct SELECT access to financial tables is not granted by this patch.
   ===================================================================== */

CREATE OR REPLACE FUNCTION public.get_mainnet_public_project_registry()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH verified_project_stakes AS (
    /* Mainnet Core investments with exact payment-to-stake binding. */
    SELECT
      s.project_id,
      s.user_id,
      s.amount
    FROM public.stakes AS s
    JOIN public.core_investment_payments AS pay
      ON pay.id = s.core_investment_payment_id
     AND pay.project_id = s.project_id
     AND pay.payer_user_id = s.user_id
     AND pay.payer_pi_uid = s.pi_uid
     AND pay.payment_id = s.payment_id
     AND pay.amount = s.amount
     AND pay.network = 'mainnet'
     AND lower(pay.pi_status) = 'completed'
     AND lower(pay.verification_status) = 'verified'
    JOIN public.projects AS project
      ON project.id = s.project_id
     AND project.project_code = s.project_code
     AND project.network = 'mainnet'
     AND lower(project.project_type) = 'core'
    JOIN public.users AS u
      ON u.id = pay.payer_user_id
     AND u.pi_uid = pay.payer_pi_uid
     AND u.network = 'mainnet'
    WHERE s.network = 'mainnet'
      AND s.status IN ('active', 'matured', 'capital_withdrawn')
      AND s.core_investment_payment_id IS NOT NULL
      AND s.internal_investment_payment_id IS NULL

    UNION ALL

    /* Mainnet Contributor Internal investments with exact binding. */
    SELECT
      s.project_id,
      s.user_id,
      s.amount
    FROM public.stakes AS s
    JOIN public.internal_investment_payments AS pay
      ON pay.id = s.internal_investment_payment_id
     AND pay.project_id = s.project_id
     AND pay.payer_user_id = s.user_id
     AND pay.payer_pi_uid = s.pi_uid
     AND pay.payment_id = s.payment_id
     AND pay.amount = s.amount
     AND pay.network = 'mainnet'
     AND lower(pay.pi_status) = 'completed'
     AND lower(pay.verification_status) = 'verified'
    JOIN public.projects AS project
      ON project.id = s.project_id
     AND project.project_code = s.project_code
     AND project.network = 'mainnet'
     AND lower(project.project_type) = 'internal'
    JOIN public.users AS u
      ON u.id = pay.payer_user_id
     AND u.pi_uid = pay.payer_pi_uid
     AND u.network = 'mainnet'
    WHERE s.network = 'mainnet'
      AND s.status IN ('active', 'matured', 'capital_withdrawn')
      AND s.internal_investment_payment_id IS NOT NULL
      AND s.core_investment_payment_id IS NULL
  ),
  project_metrics AS (
    SELECT
      v.project_id,
      pg_catalog.round(pg_catalog.sum(v.amount), 7) AS total_invested_pi,
      pg_catalog.count(DISTINCT v.user_id)::integer AS investor_count
    FROM verified_project_stakes AS v
    GROUP BY v.project_id
  ),
  eligible_projects AS (
    SELECT
      p.id,
      p.project_code,
      p.slug,
      p.name,
      p.description,
      p.project_type,
      p.core_slot,
      p.network,
      p.status,
      p.logo_url,
      p.logo_path,
      p.logo_width,
      p.logo_height,
      p.logo_format,
      p.logo_size_bytes,
      p.registration_source,
      p.updated_at,
      m.total_invested_pi,
      m.investor_count
    FROM public.projects AS p
    LEFT JOIN project_metrics AS m
      ON m.project_id = p.id
    WHERE p.network = 'mainnet'
      AND lower(p.status) IN ('approved', 'active')
      AND p.logo_url IS NOT NULL
      AND pg_catalog.length(pg_catalog.btrim(p.logo_url)) > 0
      AND p.logo_path IS NOT NULL
      AND pg_catalog.length(pg_catalog.btrim(p.logo_path)) > 0
      AND upper(p.project_code) NOT LIKE 'HAUWAL%'
      AND lower(coalesce(p.slug, '')) <> 'hauwal-maize-processing'
      AND lower(coalesce(p.name, '')) <> 'hauwal maize processing'
  )
  SELECT coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', p.id,
        'project_code', p.project_code,
        'slug', p.slug,
        'name', p.name,
        'description', p.description,
        'project_type', p.project_type,
        'core_slot', p.core_slot,
        'network', 'mainnet',
        'status', p.status,
        'logo_url', p.logo_url,
        'logo_path', p.logo_path,
        'logo_width', p.logo_width,
        'logo_height', p.logo_height,
        'logo_format', p.logo_format,
        'logo_size_bytes', p.logo_size_bytes,
        'registration_source', p.registration_source,
        'updated_at', p.updated_at,
        'total_invested_pi',
          CASE
            WHEN lower(p.project_type) IN ('core', 'internal')
              THEN coalesce(p.total_invested_pi, 0)
            ELSE NULL
          END,
        'investor_count',
          CASE
            WHEN lower(p.project_type) IN ('core', 'internal')
              THEN coalesce(p.investor_count, 0)
            ELSE NULL
          END,
        'investment_metrics_available',
          lower(p.project_type) IN ('core', 'internal')
      )
      ORDER BY p.core_slot NULLS LAST, p.name
    ),
    '[]'::jsonb
  )
  FROM eligible_projects AS p;
$function$;

/* Replace inherited PUBLIC execution with explicit read-only client roles. */
REVOKE ALL ON FUNCTION public.get_mainnet_public_project_registry() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_mainnet_public_project_registry() FROM anon;
REVOKE ALL ON FUNCTION public.get_mainnet_public_project_registry() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_mainnet_public_project_registry() TO anon;
GRANT EXECUTE ON FUNCTION public.get_mainnet_public_project_registry() TO authenticated;

COMMENT ON FUNCTION public.get_mainnet_public_project_registry() IS
  'Mainnet-only public project catalog. Returns approved/active projects and privacy-safe aggregates derived from exactly matched completed/verified Core and Internal investment settlements. No network argument; no investor-identifying fields.';

/* =====================================================================
   POST-APPLY VERIFICATION (run separately after the function is installed)

   SELECT public.get_mainnet_public_project_registry();

   SELECT
     has_function_privilege('anon', 'public.get_mainnet_public_project_registry()', 'EXECUTE')
       AS anon_can_execute,
     has_function_privilege('authenticated', 'public.get_mainnet_public_project_registry()', 'EXECUTE')
       AS authenticated_can_execute,
     EXISTS (
       SELECT 1
       FROM pg_catalog.pg_proc AS proc
       CROSS JOIN LATERAL pg_catalog.aclexplode(
         coalesce(proc.proacl, pg_catalog.acldefault('f', proc.proowner))
       ) AS acl
       WHERE proc.oid = 'public.get_mainnet_public_project_registry()'::regprocedure
         AND acl.grantee = 0
         AND acl.privilege_type = 'EXECUTE'
     ) AS public_role_can_execute;

   Expected: anon=true, authenticated=true, PUBLIC=false.
   Confirm every returned row has network='mainnet' and no Hauwal project.
   ===================================================================== */

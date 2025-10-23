-- ============================================================================
-- V10 PRODUCTION DEPLOYMENT - COMPLETE
-- Date: October 23, 2025, 22:30 UTC
-- Purpose: Deploy complete PROD schema with full funnel to production
-- ============================================================================

-- ============================================================================
-- STEP 1: Apply fact_events creation (from 03_CREATE_FACT_EVENTS_FULL_FUNNEL.sql)
-- ============================================================================
\i /Users/Kirill/planerix_new/sql/v10/03_CREATE_FACT_EVENTS_FULL_FUNNEL.sql

-- ============================================================================
-- STEP 2: Fix is_contract flag in stg.crm_events
-- ============================================================================
UPDATE stg.crm_events
SET is_contract = TRUE,
    contract_amount = dc.total_cost_of_the_contract,
    contract_date = dc.currentdate
FROM raw.itcrm_docs_clients dc
WHERE stg.crm_events.id_source = dc.id_source
  AND dc.total_cost_of_the_contract > 0;

-- ============================================================================
-- STEP 3: Populate prod.fact_events with ALL client funnel
-- ============================================================================
SELECT * FROM prod.refresh_prod_fact_events();

-- ============================================================================
-- STEP 4: Populate prod.fact_contracts with multi-touch attribution
-- ============================================================================
SELECT * FROM prod.refresh_prod_fact_contracts();

-- ============================================================================
-- VERIFICATION: Check all data loaded correctly
-- ============================================================================
DO $$
DECLARE
  v_events BIGINT;
  v_contracts BIGINT;
  v_events_contracts BIGINT;
  v_revenue NUMERIC;
BEGIN
  -- Check fact_events
  SELECT COUNT(*), SUM(CASE WHEN is_contract THEN 1 ELSE 0 END), SUM(COALESCE(contract_amount, 0))
  INTO v_events, v_events_contracts, v_revenue
  FROM prod.fact_events;

  -- Check fact_contracts
  SELECT COUNT(*) INTO v_contracts FROM prod.fact_contracts;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PRODUCTION DEPLOYMENT VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'prod.fact_events: % rows (%% contracts)', v_events, v_events_contracts;
  RAISE NOTICE 'prod.fact_contracts: % rows', v_contracts;
  RAISE NOTICE 'Total revenue: % UAH', v_revenue;
  RAISE NOTICE '';

  -- Check platforms
  RAISE NOTICE 'Platform distribution:';
  FOR rec IN
    SELECT platform, COUNT(*) as cnt
    FROM prod.fact_events
    GROUP BY platform
    ORDER BY cnt DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '  %: % events', rec.platform, rec.cnt;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DEPLOYMENT COMPLETE ✅';
  RAISE NOTICE '========================================';
END $$;

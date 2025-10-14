-- ============================================================================
-- WORKFLOW NODE: Refresh All v6 Analytics Views
-- ============================================================================
-- Этот код нужно добавить в n8n workflow "2 Staging"
-- После последней ноды
-- ============================================================================

-- Refresh all v6 materialized views
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v6_contracts_enriched;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v6_product_performance;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v6_branch_performance;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v6_campaign_roi_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v6_attribution_coverage;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v6_funnel_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboards.v6_contracts_with_attribution_detail;

-- Verification
SELECT
  'v6_analytics_refreshed' as status,
  (SELECT COUNT(*) FROM dashboards.v6_contracts_enriched) as contracts_enriched,
  (SELECT COUNT(*) FROM dashboards.v6_product_performance) as products,
  (SELECT COUNT(*) FROM dashboards.v6_branch_performance) as branches,
  (SELECT COUNT(*) FROM dashboards.v6_campaign_roi_daily) as campaign_roi_rows,
  (SELECT COUNT(*) FROM dashboards.v6_attribution_coverage) as attribution_days,
  (SELECT COUNT(*) FROM dashboards.v6_funnel_daily) as funnel_rows,
  (SELECT COUNT(*) FROM dashboards.v6_contracts_with_attribution_detail) as contracts_detail,
  now() as refreshed_at;

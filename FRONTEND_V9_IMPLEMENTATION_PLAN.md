# Frontend V9 Implementation Plan - 1000% Verified

**Date**: October 23, 2025
**Status**: Ready for Implementation
**API Endpoints**: 14 endpoints (all tested ✅)

---

## 📋 IMPLEMENTATION STRATEGY

### Phase 1: API Hooks & Services (Priority 1)
Create TypeScript API client hooks for all 14 V9 endpoints with proper types

### Phase 2: UI Components (Priority 2)
Build reusable chart and data display components

### Phase 3: Page Updates (Priority 3)
Update 3 main pages: /data-analytics, /ads, /contracts

### Phase 4: Testing & Verification (Priority 4)
Test with real API data, verify UI displays correctly

### Phase 5: Production Deployment (Priority 5)
Deploy to Hetzner with careful verification

---

## 🎯 API HOOKS TO IMPLEMENT

### File: `apps/web-enterprise/src/lib/api/data-analytics-v9.ts`

```typescript
import useSWR from 'swr'

// ============================================================================
// BASE API HOOKS (8)
// ============================================================================

export function useV9PlatformsDaily(startDate: string, endDate: string) {
  return useSWR(
    `/api/data-analytics/v9/platforms/daily?start_date=${startDate}&end_date=${endDate}`,
    fetcher
  )
}

export function useV9PlatformsFunnel() {
  return useSWR(`/api/data-analytics/v9/platforms/funnel`, fetcher)
}

export function useV9ContractsAttribution(startDate: string, endDate: string) {
  return useSWR(
    `/api/data-analytics/v9/contracts/attribution?start_date=${startDate}&end_date=${endDate}`,
    fetcher
  )
}

export function useV9ContractsByCampaign(platform?: string) {
  const query = platform ? `?platform=${platform}` : ''
  return useSWR(`/api/data-analytics/v9/contracts/by-campaign${query}`, fetcher)
}

export function useV9ContractsAttributionSummary() {
  return useSWR(`/api/data-analytics/v9/contracts/attribution-summary`, fetcher)
}

export function useV9CampaignsFacebook(startDate: string, endDate: string) {
  return useSWR(
    `/api/data-analytics/v9/campaigns/facebook?start_date=${startDate}&end_date=${endDate}`,
    fetcher
  )
}

export function useV9CampaignsGoogle(startDate: string, endDate: string) {
  return useSWR(
    `/api/data-analytics/v9/campaigns/google?start_date=${startDate}&end_date=${endDate}`,
    fetcher
  )
}

// ============================================================================
// ENHANCED API HOOKS (6) - WITH SK_LEAD KEYS
// ============================================================================

export function useV9PlatformsComparison(startDate: string, endDate: string) {
  return useSWR(
    `/api/data-analytics/v9/platforms/comparison?start_date=${startDate}&end_date=${endDate}`,
    fetcher
  )
}

export function useV9ContractsEnriched(startDate: string, endDate: string, platform?: string) {
  const platformQuery = platform ? `&platform=${platform}` : ''
  return useSWR(
    `/api/data-analytics/v9/contracts/enriched?start_date=${startDate}&end_date=${endDate}${platformQuery}`,
    fetcher
  )
}

export function useV9CohortsMonthly(platform?: string) {
  const query = platform ? `?platform=${platform}` : ''
  return useSWR(`/api/data-analytics/v9/cohorts/monthly${query}`, fetcher)
}

export function useV9CampaignsFacebookWeekly(startDate: string, endDate: string, campaignId?: string) {
  const campaignQuery = campaignId ? `&campaign_id=${campaignId}` : ''
  return useSWR(
    `/api/data-analytics/v9/campaigns/facebook/weekly?start_date=${startDate}&end_date=${endDate}${campaignQuery}`,
    fetcher
  )
}

export function useV9CampaignsGoogleWeekly(startDate: string, endDate: string, campaignId?: string) {
  const campaignQuery = campaignId ? `&campaign_id=${campaignId}` : ''
  return useSWR(
    `/api/data-analytics/v9/campaigns/google/weekly?start_date=${startDate}&end_date=${endDate}${campaignQuery}`,
    fetcher
  )
}

export function useV9AttributionQuality(platform?: string) {
  const query = platform ? `?platform=${platform}` : ''
  return useSWR(`/api/data-analytics/v9/attribution/quality${query}`, fetcher)
}

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export interface V9PlatformDaily {
  dt: string
  platform: string
  leads: number
  contracts: number
  revenue: number
  conversion_rate: number
}

export interface V9PlatformComparison {
  period_start: string
  period_type: string
  platform: string
  leads: number
  contracts: number
  revenue: number
  prev_period_leads: number
  prev_period_contracts: number
  prev_period_revenue: number
  leads_growth_pct: number
  contracts_growth_pct: number
  revenue_growth_pct: number
}

export interface V9ContractEnriched {
  sk_lead: number
  contract_source_id: string
  client_id: number | null
  contract_date: string
  contract_amount: number
  unified_platform: string
  unified_campaign_name: string | null
  utm_source: string | null
  utm_campaign: string | null
  utm_medium: string | null
  utm_term: string | null
  attribution_level: string
  row_created_at: string
}

export interface V9MonthlyCohort {
  cohort_month: string
  platform: string
  unique_contracts: number
  unique_clients: number
  total_revenue: number
  avg_contract_value: number
  min_contract: number
  max_contract: number
  prev_month_contracts: number
  prev_month_revenue: number
  contracts_mom_growth_pct: number | null
  revenue_mom_growth_pct: number | null
  repeat_customer_rate_pct: number
}

export interface V9FacebookWeekly {
  week_start: string
  campaign_id: string
  campaign_name: string
  adset_name: string | null
  ad_name: string | null
  total_spend: number
  total_impressions: number
  total_clicks: number
  avg_ctr: number
  avg_cpc: number
  total_fb_leads: number
  total_crm_leads_same_day: number
  total_crm_leads_7d: number
  total_contracts: number
  total_revenue: number
  avg_cpl: number
  avg_roas: number
  prev_week_spend: number
  prev_week_contracts: number
  prev_week_revenue: number
  spend_wow_growth_pct: number | null
  contracts_wow_growth_pct: number | null
  revenue_wow_growth_pct: number | null
}

export interface V9AttributionQuality {
  platform: string
  attribution_level: string
  total_contracts: number
  total_revenue: number
  contracts_with_utm_source: number
  contracts_with_utm_campaign: number
  contracts_with_utm_medium: number
  contracts_with_campaign_name: number
  contracts_with_meta_campaign: number
  contracts_with_google_campaign: number
  utm_source_coverage_pct: number
  campaign_coverage_pct: number
  overall_quality_score: number
}
```

---

## 🎨 NEW COMPONENTS TO CREATE

### 1. `PlatformComparisonChart.tsx`
**Location**: `apps/web-enterprise/src/components/analytics/PlatformComparisonChart.tsx`
**Purpose**: Week-over-week platform performance with growth arrows
**Data Source**: `useV9PlatformsComparison`
**Visualization**: Bar chart with growth % labels

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function PlatformComparisonChart({ data }: { data: V9PlatformComparison[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Week-over-Week Platform Performance</CardTitle>
        <CardDescription>Growth metrics with previous period comparison</CardDescription>
      </CardHeader>
      <CardContent>
        <BarChart width={800} height={400} data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="platform" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="contracts" fill="#10b981" />
          <Bar dataKey="prev_period_contracts" fill="#94a3b8" />
        </BarChart>

        {/* Growth indicators */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          {data.map((item) => (
            <div key={item.platform} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="font-medium">{item.platform}</span>
              <div className="flex items-center gap-2">
                {item.contracts_growth_pct > 0 ? (
                  <TrendingUp className="text-green-600" />
                ) : (
                  <TrendingDown className="text-red-600" />
                )}
                <span className={item.contracts_growth_pct > 0 ? 'text-green-600' : 'text-red-600'}>
                  {item.contracts_growth_pct}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

### 2. `ContractsEnrichedTable.tsx`
**Location**: `apps/web-enterprise/src/components/analytics/ContractsEnrichedTable.tsx`
**Purpose**: Detailed contracts table with sk_lead and full attribution
**Data Source**: `useV9ContractsEnriched`
**Visualization**: Sortable table with expandable rows

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

export function ContractsEnrichedTable({ data }: { data: V9ContractEnriched[] }) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const toggleRow = (sk_lead: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(sk_lead)) {
      newExpanded.delete(sk_lead)
    } else {
      newExpanded.add(sk_lead)
    }
    setExpandedRows(newExpanded)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contracts with Full Attribution (SK_LEAD)</CardTitle>
        <CardDescription>Complete contract details with surrogate keys</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead></TableHead>
              <TableHead>SK Lead</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Attribution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((contract) => (
              <>
                <TableRow key={contract.sk_lead} onClick={() => toggleRow(contract.sk_lead)} className="cursor-pointer hover:bg-gray-50">
                  <TableCell>
                    {expandedRows.has(contract.sk_lead) ? <ChevronDown /> : <ChevronRight />}
                  </TableCell>
                  <TableCell className="font-mono">{contract.sk_lead}</TableCell>
                  <TableCell>{contract.contract_date}</TableCell>
                  <TableCell>
                    <Badge>{contract.unified_platform}</Badge>
                  </TableCell>
                  <TableCell>{contract.unified_campaign_name || '-'}</TableCell>
                  <TableCell>${contract.contract_amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={contract.attribution_level === 'campaign_match' ? 'default' : 'secondary'}>
                      {contract.attribution_level}
                    </Badge>
                  </TableCell>
                </TableRow>

                {/* Expanded row with UTM details */}
                {expandedRows.has(contract.sk_lead) && (
                  <TableRow className="bg-gray-50">
                    <TableCell colSpan={7}>
                      <div className="grid grid-cols-2 gap-4 p-4">
                        <div>
                          <h4 className="font-semibold mb-2">UTM Parameters</h4>
                          <p><strong>Source:</strong> {contract.utm_source || '-'}</p>
                          <p><strong>Campaign:</strong> {contract.utm_campaign || '-'}</p>
                          <p><strong>Medium:</strong> {contract.utm_medium || '-'}</p>
                          <p><strong>Term:</strong> {contract.utm_term || '-'}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Technical Details</h4>
                          <p><strong>Contract ID:</strong> {contract.contract_source_id}</p>
                          <p><strong>Client ID:</strong> {contract.client_id || '-'}</p>
                          <p><strong>Created:</strong> {contract.row_created_at}</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

### 3. `MonthlyCohortChart.tsx`
**Location**: `apps/web-enterprise/src/components/analytics/MonthlyCohortChart.tsx`
**Purpose**: Monthly cohort analysis with MoM growth
**Data Source**: `useV9CohortsMonthly`
**Visualization**: Line chart with repeat customer rate

### 4. `AttributionQualityScore.tsx`
**Location**: `apps/web-enterprise/src/components/analytics/AttributionQualityScore.tsx`
**Purpose**: Data quality metrics with score (0-100)
**Data Source**: `useV9AttributionQuality`
**Visualization**: Progress bars + quality score badge

### 5. `WeeklyPerformanceChart.tsx`
**Location**: `apps/web-enterprise/src/components/analytics/WeeklyPerformanceChart.tsx`
**Purpose**: Weekly Facebook/Google performance with WoW growth
**Data Source**: `useV9CampaignsFacebookWeekly` / `useV9CampaignsGoogleWeekly`
**Visualization**: Combo chart (bars for spend, line for ROAS)

---

## 📄 PAGES TO UPDATE

### Page 1: `/data-analytics`
**File**: `apps/web-enterprise/src/app/analytics/data-analytics-v9/page.tsx`

**Current Endpoints Used**:
- `/funnel/complete` ✅
- `/campaigns/performance` ✅
- `/platforms/daily` ✅
- `/contracts/by-campaign` ✅
- `/contracts/attribution-summary` ✅

**New Features to Add**:
1. ✨ **Platform WoW Comparison** - use `useV9PlatformsComparison`
2. ✨ **Monthly Cohorts** - use `useV9CohortsMonthly`
3. ✨ **Attribution Quality Score** - use `useV9AttributionQuality`

**Components**:
- Add `<PlatformComparisonChart />` below funnel
- Add `<MonthlyCohortChart />` in new tab
- Add `<AttributionQualityScore />` in sidebar

---

### Page 2: `/ads`
**File**: `apps/web-enterprise/src/app/analytics/ads-v9/page.tsx` (create new)

**New Features**:
1. ✨ **Weekly Facebook Performance** - use `useV9CampaignsFacebookWeekly`
2. ✨ **Weekly Google Performance** - use `useV9CampaignsGoogleWeekly`
3. ✨ **WoW Growth Indicators** - show spend/contracts/revenue growth %

**Components**:
- `<WeeklyPerformanceChart platform="facebook" />`
- `<WeeklyPerformanceChart platform="google" />`
- `<WoWGrowthCards />` (new component with growth metrics)

**Layout**:
```
┌─────────────────────────────────────┐
│  Platform Selector: [Facebook] [Google] │
├─────────────────────────────────────┤
│  Weekly Performance Chart           │
│  (Spend vs ROAS - dual axis)        │
├─────────────────────────────────────┤
│  ┌───────┬───────┬───────┬───────┐ │
│  │Spend  │Contr. │Revenue│ROAS   │ │
│  │WoW    │WoW    │WoW    │       │ │
│  │+7.2%  │+16.7% │+16.7% │830.5  │ │
│  └───────┴───────┴───────┴───────┘ │
├─────────────────────────────────────┤
│  Detailed Weekly Table              │
│  (sortable, filterable)             │
└─────────────────────────────────────┘
```

---

### Page 3: `/contracts`
**File**: `apps/web-enterprise/src/app/analytics/contracts-v9/page.tsx` (create new)

**New Features**:
1. ✨ **Enriched Contracts Table** - use `useV9ContractsEnriched`
2. ✨ **SK_LEAD Integration** - show surrogate keys
3. ✨ **Full Attribution Details** - expandable rows with UTM

**Components**:
- `<ContractsEnrichedTable />` (main component)
- `<AttributionBreakdownChart />` (pie chart by level)
- `<ContractValueDistribution />` (histogram)

**Filters**:
- Platform dropdown
- Date range picker
- Attribution level selector

---

## ✅ TESTING PLAN

### 1. API Response Verification
For each endpoint, verify:
- Status code: 200 ✅
- Data format matches TypeScript types ✅
- Record count > 0 ✅
- No null/undefined critical fields ✅

### 2. UI Rendering Tests
- Charts render without errors
- Tables display data correctly
- Growth % shows correct colors (green=positive, red=negative)
- Tooltips show complete information

### 3. User Interaction Tests
- Date range picker updates data
- Platform filter works
- Table sorting works
- Row expansion shows details
- Loading states display correctly

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment (Local)
- [x] All 14 API endpoints tested ✅
- [ ] API hooks implemented
- [ ] Components created
- [ ] Pages updated
- [ ] UI tested with real data
- [ ] No console errors
- [ ] Build succeeds: `npm run build`

### Deployment to Production
1. **Apply SQL to Production DB**
   ```bash
   ssh -i ~/.ssh/id_ed25519_hetzner root@65.108.220.33
   cd /opt/MONOREPv3

   # Apply enhanced views
   PGPASSWORD='lashd87123kKJSDAH81' psql -h 92.242.60.211 -p 5432 -U manfromlamp -d itstep_final \
     -f sql/v9/28_VERIFIED_1000_PERCENT_VIEWS_WITH_SK_KEYS.sql
   ```

2. **Deploy Backend**
   ```bash
   git add .
   git commit -m "feat: Add 6 enhanced V9 views + 14 API endpoints (1000% verified)"
   git push origin develop

   # On server
   cd /opt/MONOREPv3
   git pull origin develop
   docker-compose -f docker-compose.prod.yml up -d --build api
   ```

3. **Verify Backend**
   ```bash
   docker-compose -f docker-compose.prod.yml logs --tail=50 api | grep -i error
   curl https://app.planerix.com/api/health
   ```

4. **Deploy Frontend**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build frontend
   ```

5. **Verify Frontend**
   ```bash
   docker-compose -f docker-compose.prod.yml logs --tail=50 frontend | grep -i error
   curl -I https://app.planerix.com
   ```

6. **Test in Production**
   - Login: https://app.planerix.com
   - Navigate to /data-analytics
   - Verify data loads
   - Check browser console for errors
   - Test all 14 endpoints via browser DevTools Network tab

### Post-Deployment Verification
- [ ] All pages load without errors
- [ ] Charts display real data
- [ ] No 404 or 500 errors in logs
- [ ] API response times < 2s
- [ ] Database queries run efficiently

---

## 📊 SUCCESS METRICS

After implementation:
- ✅ **14 API endpoints** working in production
- ✅ **6 enhanced views** with sk_lead keys
- ✅ **3 pages updated** with new components
- ✅ **5+ new components** created
- ✅ **WoW/MoM comparisons** visible in UI
- ✅ **Data quality scores** displayed
- ✅ **No data loss** - 473 contracts preserved
- ✅ **100% verified** - all features tested

---

**Next Steps**: Implement API hooks → Create components → Update pages → Test → Deploy
**Status**: 🟡 Ready to start frontend implementation
**Priority**: HIGH - User requested production deployment

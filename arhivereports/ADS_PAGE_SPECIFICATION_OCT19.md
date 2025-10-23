# /ads Page - Detailed Ads Analytics Specification

**Date**: October 19, 2025, 16:00 CEST
**Status**: 📋 **DESIGN PHASE**
**Goal**: Create professional ads analytics page with creative visualization and detailed performance tracking

---

## 📊 Data Available

### Facebook Ads Raw Data
- **Performance**: `raw.fb_ad_insights` (10,266 records, 59 campaigns, 328 ads)
  - Date range: 2025-09-13 to 2025-10-18
  - Total spend: ₴63,067
  - Impressions: 11,105,600
  - Clicks: 171,292
  - 43 unique action types

- **Ads Metadata**: `raw.fb_ads` (links ads to creatives)
  - ad_id → ad_creative_id mapping
  - Status, created_time, updated_time

- **Creative Details**: `raw.fb_ad_creative_details` (1,167 creatives)
  - **366 creatives with images** (`media_image_src`)
  - 568 with permalinks
  - Title, body, description, CTA type
  - Video support (video_id)

- **Campaign/AdSet Structure**: `raw.fb_campaigns`, `raw.fb_adsets`

- **Leads**: `raw.fb_leads` (283 leads)
  - With campaign_id, adset_id, ad_id attribution

### Google Ads Raw Data
- **Performance**: `raw.google_ads_campaign_daily` (266 records, 9 campaigns)
  - Date range: 2025-09-10 to 2025-10-18
  - Total spend: ₴53,127
  - Clicks: 4,952
  - GA conversions: 72 tracked

- **Ad-level**: `raw.google_ads_ad_daily` (available for drill-down)

- **Assets**: `raw.google_ads_asset_dim` (images, headlines, descriptions)

### Attribution Data
- **CRM Leads**: `dashboards.fact_leads` (16,798 total)
  - Facebook: 487 leads matched, 20 contracts, ₴16.9M revenue
  - Google: 50 leads matched, 5 contracts, ₴303K revenue

---

## 🎯 Page Features

### 1. Top KPI Cards (Summary)
```
┌──────────────────────────────────────────────────────────────┐
│  Total Spend    Impressions     Clicks        Leads    ROAS  │
│  ₴116,194       11.5M          176K          537      145x   │
│  (FB + Google)                                                │
└──────────────────────────────────────────────────────────────┘
```

**Metrics**:
- Total ad spend (both platforms)
- Total impressions
- Total clicks
- CRM-matched leads
- Contracts generated
- Total revenue
- ROAS (Return on Ad Spend)
- CPL (Cost Per Lead)
- CTR (Click-Through Rate)
- Conversion Rate

**Filters**:
- Date range picker
- Platform filter (Facebook, Google, Both)
- Campaign status (Active, Paused, All)

---

### 2. Platform Comparison

```
Platform Comparison Table:
┌──────────┬────────┬──────────┬────────┬───────┬──────────┬──────┐
│ Platform │ Spend  │ Impress. │ Clicks │ Leads │ Revenue  │ ROAS │
├──────────┼────────┼──────────┼────────┼───────┼──────────┼──────┤
│ Facebook │ ₴63K   │ 11.1M    │ 171K   │ 487   │ ₴16.9M   │ 268x │
│ Google   │ ₴53K   │ 443K     │ 4.9K   │ 50    │ ₴303K    │ 5.7x │
│ Total    │ ₴116K  │ 11.5M    │ 176K   │ 537   │ ₴17.2M   │ 148x │
└──────────┴────────┴──────────┴────────┴───────┴──────────┴──────┘
```

**Features**:
- Side-by-side platform metrics
- Sortable by any column
- Color-coded performance indicators
- Click to drill down into platform details

---

### 3. Campaign Performance Table (Main View)

**Facebook Campaigns** (expandable rows):
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Campaign Name          │ Status │ Spend  │ Clicks │ Leads │ Conv.│ ROAS     │
├───────────────────────┼────────┼────────┼────────┼───────┼──────┼──────────┤
│ ▶ Lead Gen - Autumn   │ Active │ ₴15.2K │ 45.3K  │ 125   │ 0.28%│ 245x     │
│   Ads (15):                                                                   │
│   ├─ Ad #1: "Навчання програмування" - 45 leads - ₴342 CPL                  │
│   │  [IMAGE PREVIEW]                                                          │
│   ├─ Ad #2: "IT курси для початківців" - 38 leads - ₴401 CPL                │
│   │  [IMAGE PREVIEW]                                                          │
│   └─ ...                                                                      │
├───────────────────────┼────────┼────────┼────────┼───────┼──────┼──────────┤
│ ▶ Brand Awareness     │ Active │ ₴8.5K  │ 32.1K  │ 78    │ 0.24%│ 189x     │
└───────────────────────┴────────┴────────┴────────┴───────┴──────┴──────────┘
```

**Columns**:
1. Campaign Name (expandable to show ads)
2. Status badge (Active/Paused/Ended)
3. Total Spend
4. Impressions
5. Clicks
6. CRM Leads (matched)
7. Contracts
8. Revenue
9. ROAS
10. CPL
11. CTR
12. Conversion Rate
13. Actions (View Details, Edit, Pause)

**Features**:
- Expand/collapse to show ads within campaign
- Search/filter campaigns
- Sort by any metric
- Color coding for performance
- Export to CSV

---

### 4. Ad-Level Detail View (Expandable)

When expanding a campaign, show all ads with:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Ad Details - "Навчання програмування з нуля"                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ [CREATIVE IMAGE]            │  Performance Metrics:                         │
│  (300x250 preview)           │  • Spend: ₴1,234                              │
│                               │  • Impressions: 45,678                        │
│ Title: "Навчання програм..."  │  • Clicks: 1,234                              │
│ Body: "Почни кар'єру в IT..." │  • CPL: ₴342                                  │
│ CTA: "Дізнатись більше"      │  • CTR: 2.7%                                  │
│                               │                                                │
│ [View on Facebook]            │  Lead Matching:                               │
│                               │  • Platform Leads: 12 (from fb_leads)         │
│                               │  • CRM Matched: 8 (66.7%)                     │
│                               │  • Contracts: 2 (16.7%)                       │
│                               │  • Revenue: ₴85,000                           │
│                               │                                                │
│                               │  Lead Details:                                │
│                               │  ├─ ✅ Lead #1: email@test.com → Contract     │
│                               │  ├─ ✅ Lead #2: name2@test.com → Contract     │
│                               │  ├─ ⏳ Lead #3: name3@test.com → In CRM       │
│                               │  ├─ ❌ Lead #4: name4@test.com → Not in CRM   │
│                               │  └─ ...                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Creative Visualization Features**:
- Image preview (300x250 or 1200x628 responsive)
- Video thumbnail with play button (if video_id present)
- Title, body text, description display
- CTA button preview
- Link to view original on Facebook/Google

**Lead Matching Status**:
- ✅ **Converted to Contract** (green)
- ⏳ **In CRM (no contract yet)** (yellow)
- ❌ **Not found in CRM** (red)
- Show match rate percentage

---

### 5. Creative Library (Separate Tab)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Creative Library - All Ads                                                   │
│ Filters: [All Platforms ▼] [All Campaigns ▼] [With Images Only ☑]          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Grid View (3-4 columns):                                                     │
│                                                                               │
│  [IMAGE]              [IMAGE]              [IMAGE]              [IMAGE]      │
│  Ad Name              Ad Name              Ad Name              Ad Name      │
│  45 leads, ₴342 CPL   38 leads, ₴401 CPL   22 leads, ₴567 CPL  ...          │
│  ROAS: 245x           ROAS: 189x           ROAS: 123x                        │
│  [View Details]       [View Details]       [View Details]                    │
│                                                                               │
│  [IMAGE]              [IMAGE]              ...                                │
│  ...                  ...                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Features**:
- Pinterest-style grid layout
- Lazy loading for performance
- Filter by:
  - Platform (Facebook/Google)
  - Campaign
  - Date range
  - Performance metrics (min leads, min ROAS)
- Sort by:
  - Best ROAS
  - Most leads
  - Lowest CPL
  - Most recent
- Click card to see full details

---

### 6. Time Series Charts

```
Spend & Leads Over Time (Daily):
┌─────────────────────────────────────────────────────────────────────────────┐
│  ₴                                                          Leads            │
│  3K─┐                                   Facebook Spend (bar) ───────     50─┤
│     │    ▄                               Google Spend (bar)   ───────        │
│  2K─┤   ▐█▌  ▄                           Leads (line)         ───────     40─┤
│     │   ▐█▌ ▐█▌ ▄                                                            │
│  1K─┤  ▐█▌ ▐█▌▐█▌                                                         30─┤
│     │  ▐█▌ ▐█▌▐█▌  ▄                                                         │
│   0─┴─▐█▌─▐█▌▐█▌─▐█▌───────────────────────────────────────────────────  0─┤
│     Sep 10  Sep 15  Sep 20  Sep 25  Sep 30  Oct 5   Oct 10  Oct 15  Oct 18 │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Charts**:
1. Spend by platform (stacked bar)
2. Leads over time (line chart)
3. ROAS trend (line chart)
4. CTR trend (line chart)

---

### 7. Lead Funnel Visualization

```
Ad Platform → CRM → Contract Funnel:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│  Facebook Leads      ══════════►   CRM Matched    ══════►   Contracts       │
│      283 leads                         487              │       20           │
│      (100%)                         (matched)           │     (4.1%)         │
│                                                          │                    │
│                                                          └══► ₴16.9M Revenue  │
│                                                                               │
│  Google Leads        ══════════►   CRM Matched    ══════►   Contracts       │
│       72 GA conv.                      50               │        5           │
│      (100%)                         (matched)           │     (10%)          │
│                                                          │                    │
│                                                          └══► ₴303K Revenue   │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Insights**:
- Highlight drop-off points
- Show match rates
- Identify "lost" leads (not in CRM)
- Calculate true conversion rate

---

## 🗄️ Database Views to Create

### View 1: `dashboards.v6_fb_ads_performance`

```sql
CREATE MATERIALIZED VIEW dashboards.v6_fb_ads_performance AS
WITH ad_metrics AS (
  SELECT
    fai.date_start as dt,
    fai.campaign_id,
    fai.adset_id,
    fai.ad_id,
    fai.ad_name,
    fa.ad_creative_id,
    fc.campaign_name,
    fc.status as campaign_status,
    fas.adset_name,
    fas.status as adset_status,
    fa.status as ad_status,
    -- Performance metrics
    SUM(fai.spend) as spend,
    SUM(fai.impressions) as impressions,
    SUM(fai.clicks) as clicks,
    -- Lead matching
    COUNT(DISTINCT fl_platform.fb_lead_id) as platform_leads,
    COUNT(DISTINCT fl_crm.sk_lead) as crm_leads,
    COUNT(DISTINCT CASE WHEN fl_crm.contract_amount > 0 THEN fl_crm.sk_lead END) as contracts,
    SUM(fl_crm.contract_amount) as revenue
  FROM raw.fb_ad_insights fai
  LEFT JOIN raw.fb_ads fa ON fai.ad_id = fa.ad_id
  LEFT JOIN raw.fb_campaigns fc ON fai.campaign_id = fc.campaign_id
  LEFT JOIN raw.fb_adsets fas ON fai.adset_id = fas.adset_id
  -- Match platform leads
  LEFT JOIN raw.fb_leads fl_platform ON (
    fai.ad_id = fl_platform.ad_id
    AND fai.date_start = fl_platform.request_created_at::date
  )
  -- Match CRM leads
  LEFT JOIN dashboards.fact_leads fl_crm ON (
    fai.campaign_id = fl_crm.meta_campaign_id
    AND fai.ad_id = fl_crm.meta_ad_id
    AND fai.date_start = to_date(fl_crm.created_date_txt, 'YYYY-MM-DD')
  )
  WHERE fai.date_start >= '2025-09-01'
  GROUP BY
    fai.date_start, fai.campaign_id, fai.adset_id, fai.ad_id, fai.ad_name,
    fa.ad_creative_id, fc.campaign_name, fc.status, fas.adset_name, fas.status, fa.status
),
ad_creatives AS (
  SELECT
    ad_creative_id,
    media_image_src,
    thumbnail_url,
    video_id,
    permalink_url,
    title,
    body,
    description,
    cta_type,
    link_url
  FROM raw.fb_ad_creative_details
)
SELECT
  am.*,
  ac.media_image_src,
  ac.thumbnail_url,
  ac.video_id,
  ac.permalink_url,
  ac.title as creative_title,
  ac.body as creative_body,
  ac.description as creative_description,
  ac.cta_type,
  ac.link_url,
  -- Calculated KPIs
  CASE
    WHEN am.clicks > 0 THEN (100.0 * am.clicks / NULLIF(am.impressions, 0))
  END as ctr,
  CASE
    WHEN am.crm_leads > 0 THEN am.spend / NULLIF(am.crm_leads, 0)
  END as cpl,
  CASE
    WHEN am.spend > 0 THEN am.revenue / NULLIF(am.spend, 0)
  END as roas,
  CASE
    WHEN am.crm_leads > 0 THEN (100.0 * am.contracts / NULLIF(am.crm_leads, 0))
  END as conversion_rate,
  CASE
    WHEN am.platform_leads > 0 THEN (100.0 * am.crm_leads / NULLIF(am.platform_leads, 0))
  END as match_rate
FROM ad_metrics am
LEFT JOIN ad_creatives ac ON am.ad_creative_id = ac.ad_creative_id;

CREATE INDEX idx_v6_fb_ads_date ON dashboards.v6_fb_ads_performance(dt);
CREATE INDEX idx_v6_fb_ads_campaign ON dashboards.v6_fb_ads_performance(campaign_id);
CREATE INDEX idx_v6_fb_ads_ad ON dashboards.v6_fb_ads_performance(ad_id);
CREATE INDEX idx_v6_fb_ads_creative ON dashboards.v6_fb_ads_performance(ad_creative_id);
```

### View 2: `dashboards.v6_google_ads_performance`

```sql
CREATE MATERIALIZED VIEW dashboards.v6_google_ads_performance AS
SELECT
  ga.date as dt,
  ga.campaign_id::text as campaign_id,
  ga.campaign_name,
  ga.campaign_status,
  -- Performance metrics
  SUM(ga.cost_micros::numeric / 1000000) as spend,
  SUM(ga.impressions) as impressions,
  SUM(ga.clicks) as clicks,
  SUM(ga.conversions) as ga_conversions,
  SUM(ga.all_conversions) as ga_all_conversions,
  -- Lead matching
  COUNT(DISTINCT fl.sk_lead) as crm_leads,
  COUNT(DISTINCT CASE WHEN fl.contract_amount > 0 THEN fl.sk_lead END) as contracts,
  SUM(fl.contract_amount) as revenue,
  -- KPIs
  AVG(ga.ctr) as avg_ctr,
  AVG(ga.average_cpc_micros::numeric / 1000000) as avg_cpc,
  CASE
    WHEN SUM(ga.clicks) > 0 THEN (100.0 * SUM(ga.clicks) / NULLIF(SUM(ga.impressions), 0))
  END as ctr,
  CASE
    WHEN COUNT(DISTINCT fl.sk_lead) > 0
    THEN SUM(ga.cost_micros::numeric / 1000000) / NULLIF(COUNT(DISTINCT fl.sk_lead), 0)
  END as cpl,
  CASE
    WHEN SUM(ga.cost_micros) > 0
    THEN SUM(fl.contract_amount) / NULLIF(SUM(ga.cost_micros::numeric / 1000000), 0)
  END as roas,
  CASE
    WHEN COUNT(DISTINCT fl.sk_lead) > 0
    THEN (100.0 * COUNT(DISTINCT CASE WHEN fl.contract_amount > 0 THEN fl.sk_lead END) / NULLIF(COUNT(DISTINCT fl.sk_lead), 0))
  END as conversion_rate
FROM raw.google_ads_campaign_daily ga
LEFT JOIN dashboards.fact_leads fl ON (
  ga.campaign_id::text = fl.google_campaign_id
  AND ga.date = to_date(fl.created_date_txt, 'YYYY-MM-DD')
)
WHERE ga.date >= '2025-09-01'
GROUP BY ga.date, ga.campaign_id, ga.campaign_name, ga.campaign_status;

CREATE INDEX idx_v6_google_ads_date ON dashboards.v6_google_ads_performance(dt);
CREATE INDEX idx_v6_google_ads_campaign ON dashboards.v6_google_ads_performance(campaign_id);
```

---

## 🔌 Backend API Endpoints

### 1. GET /api/ads/overview
**Description**: Summary KPIs for both platforms

**Query Params**:
- `date_from` (required): Start date
- `date_to` (required): End date
- `platform` (optional): `facebook`, `google`, or empty for both

**Response**:
```json
{
  "total_spend": 116194.28,
  "total_impressions": 11548975,
  "total_clicks": 176244,
  "crm_leads": 537,
  "platform_leads": 355,
  "contracts": 25,
  "revenue": 17236546.00,
  "roas": 148.3,
  "cpl": 216.42,
  "ctr": 1.53,
  "conversion_rate": 4.66,
  "match_rate": 66.5
}
```

---

### 2. GET /api/ads/campaigns
**Description**: Campaign-level performance data

**Query Params**:
- `date_from`, `date_to` (required)
- `platform` (optional): `facebook`, `google`
- `status` (optional): `ACTIVE`, `PAUSED`, `ALL`
- `sort` (optional): `spend`, `leads`, `roas`, `cpl`
- `limit` (optional): default 100

**Response**:
```json
{
  "data": [
    {
      "platform": "facebook",
      "campaign_id": "123456789",
      "campaign_name": "Lead Gen - Autumn",
      "campaign_status": "ACTIVE",
      "spend": 15234.56,
      "impressions": 2500000,
      "clicks": 45300,
      "crm_leads": 125,
      "platform_leads": 150,
      "contracts": 8,
      "revenue": 3450000.00,
      "roas": 226.5,
      "cpl": 121.88,
      "ctr": 1.81,
      "conversion_rate": 6.4,
      "match_rate": 83.3,
      "ad_count": 15
    }
  ]
}
```

---

### 3. GET /api/ads/ads-by-campaign
**Description**: Ad-level breakdown for a specific campaign

**Query Params**:
- `campaign_id` (required)
- `date_from`, `date_to` (required)
- `platform` (required): `facebook` or `google`

**Response**:
```json
{
  "campaign": {
    "campaign_id": "123456789",
    "campaign_name": "Lead Gen - Autumn",
    "total_ads": 15
  },
  "ads": [
    {
      "ad_id": "987654321",
      "ad_name": "Навчання програмування",
      "ad_status": "ACTIVE",
      "ad_creative_id": "creative_123",
      "spend": 1234.56,
      "impressions": 45678,
      "clicks": 1234,
      "crm_leads": 8,
      "platform_leads": 12,
      "contracts": 2,
      "revenue": 85000.00,
      "roas": 68.9,
      "cpl": 154.32,
      "ctr": 2.7,
      "conversion_rate": 25.0,
      "match_rate": 66.7,
      "creative": {
        "media_image_src": "https://...jpg",
        "thumbnail_url": "https://...jpg",
        "title": "Навчання програмування",
        "body": "Почни кар'єру в IT...",
        "cta_type": "LEARN_MORE",
        "permalink_url": "https://facebook.com/..."
      }
    }
  ]
}
```

---

### 4. GET /api/ads/ad-details/:ad_id
**Description**: Full details for a single ad including lead matching

**Path Params**:
- `ad_id`: Ad ID

**Query Params**:
- `platform`: `facebook` or `google`
- `date_from`, `date_to`

**Response**:
```json
{
  "ad": {
    "ad_id": "987654321",
    "ad_name": "Навчання програмування",
    "campaign_name": "Lead Gen - Autumn",
    "ad_status": "ACTIVE",
    "created_time": "2025-09-01T10:00:00Z",
    "metrics": {
      "spend": 1234.56,
      "impressions": 45678,
      "clicks": 1234,
      "ctr": 2.7,
      "cpl": 154.32,
      "roas": 68.9
    },
    "creative": {
      "ad_creative_id": "creative_123",
      "media_image_src": "https://scontent.xx.fbcdn.net/...",
      "title": "Навчання програмування",
      "body": "Почни кар'єру в IT з нуля...",
      "description": "Безкоштовна консультація",
      "cta_type": "LEARN_MORE",
      "link_url": "https://itstep.com/...",
      "permalink_url": "https://facebook.com/..."
    },
    "lead_funnel": {
      "platform_leads": 12,
      "crm_matched": 8,
      "crm_not_matched": 4,
      "contracts": 2,
      "revenue": 85000.00,
      "match_rate": 66.7,
      "conversion_rate": 25.0
    }
  },
  "leads": [
    {
      "fb_lead_id": "lead_123",
      "request_created_at": "2025-10-01T14:30:00Z",
      "email": "test@example.com",
      "name": "Іван Петренко",
      "status": "converted",
      "crm_id": "crm_456",
      "contract_id": "contract_789",
      "contract_amount": 42500.00,
      "contract_date": "2025-10-05"
    },
    {
      "fb_lead_id": "lead_124",
      "email": "test2@example.com",
      "name": "Олена Сидоренко",
      "status": "in_crm",
      "crm_id": "crm_457",
      "contract_id": null
    },
    {
      "fb_lead_id": "lead_125",
      "email": "test3@example.com",
      "name": "Петро Коваль",
      "status": "not_matched",
      "crm_id": null
    }
  ]
}
```

---

### 5. GET /api/ads/creatives
**Description**: Creative library with images

**Query Params**:
- `platform`: `facebook`, `google`
- `campaign_id` (optional): Filter by campaign
- `has_image` (optional): `true` to show only ads with images
- `sort`: `best_roas`, `most_leads`, `lowest_cpl`, `recent`
- `limit`: default 50

**Response**:
```json
{
  "data": [
    {
      "ad_id": "987654321",
      "ad_name": "Навчання програмування",
      "campaign_name": "Lead Gen - Autumn",
      "media_image_src": "https://...",
      "thumbnail_url": "https://...",
      "title": "Навчання програмування",
      "crm_leads": 8,
      "contracts": 2,
      "revenue": 85000.00,
      "spend": 1234.56,
      "roas": 68.9,
      "cpl": 154.32
    }
  ],
  "total": 366
}
```

---

### 6. GET /api/ads/trends
**Description**: Time series data for charts

**Query Params**:
- `date_from`, `date_to`
- `platform` (optional)
- `metric`: `spend`, `leads`, `roas`, `ctr`

**Response**:
```json
{
  "data": [
    {
      "dt": "2025-09-10",
      "facebook_spend": 1500.00,
      "google_spend": 1200.00,
      "facebook_leads": 15,
      "google_leads": 3,
      "total_spend": 2700.00,
      "total_leads": 18
    }
  ]
}
```

---

## 🎨 Frontend Component Structure

```
/apps/web-enterprise/src/app/ads/
├── page.tsx                      # Main ads page
├── components/
│   ├── AdsOverviewCards.tsx      # Top KPI cards
│   ├── PlatformComparison.tsx    # Facebook vs Google table
│   ├── CampaignTable.tsx         # Campaign performance table
│   ├── AdRow.tsx                 # Expandable ad row component
│   ├── AdDetailView.tsx          # Ad details with creative
│   ├── CreativeImage.tsx         # Image/video preview component
│   ├── LeadFunnelChart.tsx       # Lead funnel visualization
│   ├── AdsTrendChart.tsx         # Time series charts
│   ├── CreativeLibrary.tsx       # Creative grid view
│   └── CreativeCard.tsx          # Creative card in grid
└── hooks/
    ├── useAdsOverview.ts         # Fetch overview KPIs
    ├── useCampaigns.ts           # Fetch campaigns
    ├── useAdDetails.ts           # Fetch ad details
    └── useCreatives.ts           # Fetch creative library
```

---

## 📱 UI Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Planerix - Ads Analytics                                    [User Menu ▼]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Date Range: [2025-09-01] to [2025-10-18]  Platform: [Both ▼]  Status: [All]│
│                                                                               │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐  │
│  │ Spend   │ Impress.│ Clicks  │ Leads   │ Contracts│ Revenue │ ROAS    │  │
│  │ ₴116K   │ 11.5M   │ 176K    │ 537     │ 25       │ ₴17.2M  │ 148x    │  │
│  └─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘  │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Platform Comparison                                                      ││
│  ├────────┬──────────┬──────────┬────────┬───────┬──────────┬─────────────┤│
│  │ Platform│ Spend   │ Impress. │ Clicks │ Leads │ Revenue  │ ROAS        ││
│  ├────────┼──────────┼──────────┼────────┼───────┼──────────┼─────────────┤│
│  │ FB     │ ₴63K    │ 11.1M    │ 171K   │ 487   │ ₴16.9M   │ 268x 🟢    ││
│  │ Google │ ₴53K    │ 443K     │ 4.9K   │ 50    │ ₴303K    │ 5.7x 🟡    ││
│  └────────┴──────────┴──────────┴────────┴───────┴──────────┴─────────────┘│
│                                                                               │
│  Tabs: [📊 Campaigns] [🎨 Creatives] [📈 Trends] [🔀 Funnel]               │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Campaign Performance                          [Search...] [Export CSV]   ││
│  ├───────────────────┬────────┬────────┬────────┬───────┬──────┬──────────┤│
│  │ Campaign          │ Status │ Spend  │ Clicks │ Leads │ Conv.│ ROAS     ││
│  ├───────────────────┼────────┼────────┼────────┼───────┼──────┼──────────┤│
│  │▼ Lead Gen-Autumn  │ 🟢     │ ₴15.2K │ 45.3K  │ 125   │ 6.4% │ 245x     ││
│  │  ├─ Ad #1 [IMG]   │        │ ₴1.2K  │ 1.2K   │ 8     │ 25%  │ 69x      ││
│  │  ├─ Ad #2 [IMG]   │        │ ₴987   │ 987    │ 6     │ 18%  │ 52x      ││
│  │  └─ ...           │        │        │        │       │      │          ││
│  │▶ Brand Awareness  │ 🟢     │ ₴8.5K  │ 32.1K  │ 78    │ 5.1% │ 189x     ││
│  │▶ IT Courses 2025  │ ⏸      │ ₴5.3K  │ 18.7K  │ 45    │ 4.2% │ 156x     ││
│  └───────────────────┴────────┴────────┴────────┴───────┴──────┴──────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Plan

### Phase 1: Database (Day 1)
1. ✅ Analyze raw data structure (DONE)
2. Create `v6_fb_ads_performance` materialized view
3. Create `v6_google_ads_performance` materialized view
4. Create indexes
5. Test views with sample queries

### Phase 2: Backend API (Day 1-2)
1. Create `/api/ads/overview` endpoint
2. Create `/api/ads/campaigns` endpoint
3. Create `/api/ads/ads-by-campaign` endpoint
4. Create `/api/ads/ad-details/:id` endpoint
5. Create `/api/ads/creatives` endpoint
6. Create `/api/ads/trends` endpoint
7. Test all endpoints with Postman

### Phase 3: Frontend Components (Day 2-3)
1. Create base `/ads/page.tsx` with routing
2. Build `AdsOverviewCards` component
3. Build `PlatformComparison` component
4. Build `CampaignTable` with expand/collapse
5. Build `CreativeImage` component with image loading
6. Build `AdDetailView` modal
7. Add lead matching status display
8. Style with Tailwind

### Phase 4: Creative Visualization (Day 3)
1. Implement image lazy loading
2. Add video thumbnail support
3. Create `CreativeLibrary` grid view
4. Add creative filtering and sorting
5. Implement "View on Facebook" links

### Phase 5: Charts & Visualization (Day 4)
1. Add time series charts with Recharts
2. Create lead funnel visualization
3. Add platform comparison charts
4. Implement interactive tooltips

### Phase 6: Testing & Polish (Day 4)
1. Test all features end-to-end
2. Add loading states
3. Add error handling
4. Optimize performance
5. Add export to CSV functionality

---

## 📊 Success Metrics

### Functionality
- ✅ Show all 59 Facebook campaigns with ads
- ✅ Show all 9 Google campaigns
- ✅ Display 366 creative images
- ✅ Match 487 Facebook leads to CRM
- ✅ Match 50 Google leads to CRM
- ✅ Show 25 total contracts with revenue
- ✅ Calculate accurate ROAS, CPL, CTR

### User Experience
- Creative images load in <1s
- Campaign table supports 100+ rows smoothly
- Expand/collapse animations feel snappy
- Mobile responsive (works on tablets)
- Export to CSV works for campaign reports

### Business Value
- Identify best-performing creatives
- Find "lost" leads (not matched to CRM)
- Compare Facebook vs Google performance
- Track ROAS by ad to optimize budget
- Visualize lead-to-contract conversion funnel

---

**Status**: Ready for implementation!
**Next Step**: Create `v6_fb_ads_performance` materialized view


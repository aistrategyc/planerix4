# V9 Database Schema Reference - 22 октября 2025

## 📚 СПРАВОЧНИК СТРУКТУРЫ ТАБЛИЦ И КОЛОНОК

### RAW SCHEMA TABLES (исходные данные)

#### 1. raw.itcrm_new_source (Центральная таблица событий CRM)
**Ключевые поля**:
- `id_source` BIGINT - уникальный ID события (PRIMARY KEY для связей)
- `id_uniq` INTEGER - client_id (id клиента, информационное поле)
- `id_user` - ID пользователя CRM
- `type` - тип события (ссылка на itcrm_new_types.id_type)
- `date_time` TIMESTAMP - время события (**основная дата**)
- `days` DATE - дата события (nullable, может быть NULL!)
- `dogovor` INTEGER - флаг договора (0/1, НО не всегда работает!)
- `rejection`, `no_answer`, `at_event` - флаги событий
- `updated_at` TIMESTAMP

**ПРАВИЛО**: Связь с другими таблицами ВСЕГДА через `id_source`!

#### 2. raw.itcrm_docs_clients (Договора)
**Ключевые поля**:
- `contract_id` BIGINT - ID договора
- `id_source` BIGINT - связь с itcrm_new_source
- `external_user_id` BIGINT - внешний ID пользователя
- `customer` TEXT - имя клиента
- `currentdate` TIMESTAMP - дата договора (**ОСНОВНАЯ ДАТА ДОГОВОРА**)
- `total_cost_of_the_contract` NUMERIC - сумма договора
- `sum_total`, `sum_final` - другие суммы
- `payment_form` - форма оплаты

**ПРАВИЛО**: Связь с `itcrm_new_source` через `id_source`

#### 3. raw.itcrm_analytics (JSONB код с метками)
**Ключевые поля**:
- `id` BIGINT
- `internet_request_id` INTEGER - связь с internet_request
- `code` JSONB - **КРИТИЧНОЕ ПОЛЕ** с метками:
  - `fbclid` - Facebook Click ID (строка)
  - `fclid` - Facebook Click ID альтернативный (строка)
  - `fb_lead_id` - Facebook Lead ID (**ЛУЧШИЙ способ связи с fb_leads**)
  - `gclid` - Google Click ID (строка)
  - `utm_source`, `utm_campaign`, `utm_medium`, `utm_term`, `utm_content` - UTM параметры
- `phone`, `email` - контакты
- `request_created_at` TIMESTAMP - дата создания

**ПРАВИЛО**: Парсить через `code->>'fbclid'`, `code->>'fb_lead_id'`, etc.

#### 4. raw.itcrm_internet_request_relation (Связь request → source)
- `id_source` BIGINT - связь с new_source
- `id_request` INTEGER - связь с internet_request / analytics

#### 5. raw.itcrm_events_relations (Связь событий/мероприятий)
- `id_source` BIGINT - связь с new_source
- `id_event` INTEGER - связь с events (НЕ `event`!)

#### 6. raw.itcrm_new_form (Связь форм)
- `id_source` BIGINT
- `id_form` INTEGER (НЕ `form_id`!)

#### 7. raw.itcrm_new_types (Справочник типов событий)
- `id_type` INTEGER (НЕ `id`!)
- `types_descr` TEXT (НЕ `name`!)

---

### FACEBOOK TABLES (данные из рекламного кабинета)

#### 8. raw.fb_leads (Лиды из Facebook Lead Forms)
**Ключевые поля**:
- `fb_lead_id` TEXT - **PRIMARY KEY**
- `form_id` TEXT - ID формы
- `request_created_at` TIMESTAMPTZ - дата лида
- `phone`, `email`, `name` - контактные данные
- `campaign_id` TEXT - **ПРЯМАЯ СВЯЗЬ** с кампанией
- `adset_id` TEXT - **ПРЯМАЯ СВЯЗЬ** с adset
- `ad_id` TEXT - **ПРЯМАЯ СВЯЗЬ** с объявлением
- `code` JSONB - метаданные (БЕЗ fclid/fbclid!)
- `raw` JSONB - сырые данные

**ПРАВИЛО**: Связь с CRM через `itcrm_analytics.code->>'fb_lead_id' = fb_leads.fb_lead_id`

#### 9. raw.fb_ad_insights (Статистика по рекламе Facebook)
**Ключевые поля**:
- `date_start` DATE - дата
- `campaign_id` TEXT
- `adset_id` TEXT
- `ad_id` TEXT
- `ad_name` TEXT (**ЕСТЬ ad_name, НЕТ campaign_name/adset_name!**)
- `spend` NUMERIC - расходы
- `impressions`, `clicks`, `reach` INTEGER

**ПРАВИЛО**: Для получения campaign_name нужен JOIN с fb_campaigns!

#### 10. raw.fb_campaigns (Справочник кампаний)
- `campaign_id` TEXT - PRIMARY KEY (НЕ `id`!)
- `name` TEXT - название кампании
- `status`, `effective_status`

#### 11. raw.fb_adsets (Справочник adsets)
- `adset_id` TEXT - PRIMARY KEY (НЕ `id`!)
- `campaign_id` TEXT
- `name` TEXT

#### 12. raw.fb_ads (Справочник объявлений)
- `ad_id` TEXT - PRIMARY KEY (НЕ `id`!)
- `ad_name` TEXT (НЕ `name`!)
- `adset_id`, `campaign_id` TEXT

---

### GOOGLE ADS TABLES

#### 13. raw.google_ads_clicks (Клики Google Ads)
- `gclid` TEXT - PRIMARY KEY
- `date` DATE
- `campaign_id` BIGINT
- `ad_group_id` BIGINT
- `customer_id` BIGINT

#### 14. raw.google_ads_campaign_daily (Статистика по кампаниям)
- `date` DATE
- `campaign_id` BIGINT
- `campaign_name` TEXT (**ЕСТЬ campaign_name**)
- `cost` NUMERIC (НЕ `spend`!)
- `impressions`, `clicks` INTEGER

#### 15. raw.google_ads_names (Справочник названий)
- `customer_id` BIGINT (часть composite key)
- `campaign_id` BIGINT
- `campaign_name` TEXT
- `ad_group_id` BIGINT
- `ad_group_name` TEXT
- `ad_id` BIGINT
- `ad_name` TEXT

---

### STG SCHEMA (Staging/Normalized Data)

#### 16. stg.crm_events
- `id_source` BIGINT PRIMARY KEY
- `client_id` INTEGER (id_uniq из raw)
- `event_date` TIMESTAMP
- `event_day` DATE (NOT NULL, использовать `event_date::date`)
- `event_type_id`, `event_type_name`
- `is_first_touch` BOOLEAN
- `is_contract`, `is_rejection`, `is_no_answer` BOOLEAN
- `contract_amount`, `contract_date`

#### 17. stg.source_attribution
- `id_source` BIGINT PRIMARY KEY
- `fbclid`, `fclid`, `gclid` VARCHAR(500)
- `fb_lead_id` VARCHAR(100) - **ДОБАВЛЕНО для прямой связи**
- `utm_source`, `utm_campaign`, `utm_medium`, `utm_term`, `utm_content`
- `dominant_platform` VARCHAR(50)
- `source_type`
- `phone`, `email`
- `internet_request_id`, `event_id`, `form_id`

#### 18. stg.marketing_match
- `id_source` BIGINT PRIMARY KEY
- `matched_platform` VARCHAR(50)
- Facebook fields: `fb_campaign_id`, `fb_campaign_name`, `fb_adset_id`, `fb_adset_name`, `fb_ad_id`, `fb_ad_name`
- Google fields: `google_campaign_id`, `google_campaign_name`, `google_ad_group_id`, `google_ad_group_name`
- Unified: `campaign_id`, `campaign_name`, `ad_id`, `ad_name`

#### 19. stg.fact_leads
- `lead_source_id` BIGINT PRIMARY KEY
- `client_id` INTEGER
- `lead_date` TIMESTAMP, `lead_day` DATE
- `lead_event_type`
- Attribution: `dominant_platform`, `source_type`, `utm_source`, etc.
- Marketing: `matched_platform`, `campaign_id`, `campaign_name`, `ad_id`, `ad_name`, `fb_adset_id`, `fb_adset_name`
- Contact: `phone`, `email`

#### 20. stg.fact_contracts
- `contract_source_id` BIGINT PRIMARY KEY
- `client_id` INTEGER
- `contract_date` TIMESTAMP, `contract_day` DATE
- `contract_amount` NUMERIC
- **FIRST TOUCH ATTRIBUTION**: `lead_source_id`, `lead_date`, `lead_day`, `dominant_platform`, etc.
- `days_to_contract` INTEGER

---

## 🔗 КЛЮЧЕВЫЕ СВЯЗИ

### 1. CRM Event → Attribution
```sql
FROM stg.crm_events ce
JOIN stg.source_attribution attr ON ce.id_source = attr.id_source
```

### 2. CRM → Analytics (JSONB parsing)
```sql
FROM raw.itcrm_new_source ns
LEFT JOIN raw.itcrm_internet_request_relation irr ON ns.id_source = irr.id_source
LEFT JOIN raw.itcrm_analytics ia ON irr.id_request = ia.internet_request_id
WHERE ia.code->>'fb_lead_id' IS NOT NULL
```

### 3. Facebook Leads Matching (6 способов)
```sql
FROM stg.source_attribution attr
LEFT JOIN raw.fb_leads ON (
  -- Способ 1: fb_lead_id (ЛУЧШИЙ)
  attr.fb_lead_id = fb_leads.fb_lead_id
  OR
  -- Способ 2: fclid
  attr.fclid = fb_leads.code->>'fclid'
  OR
  -- Способ 3: phone
  regexp_replace(attr.phone, '\D', '', 'g') = regexp_replace(fb_leads.phone, '\D', '', 'g')
  OR
  -- Способ 4: email
  LOWER(attr.email) = LOWER(fb_leads.email)
)
```

### 4. Facebook Ad Details
```sql
FROM raw.fb_ad_insights ins
LEFT JOIN raw.fb_campaigns c ON ins.campaign_id = c.campaign_id
LEFT JOIN raw.fb_adsets a ON ins.adset_id = a.adset_id
LEFT JOIN raw.fb_ads ad ON ins.ad_id = ad.ad_id
```

### 5. Google Ads Details
```sql
FROM raw.google_ads_clicks clicks
LEFT JOIN raw.google_ads_names names ON (
  clicks.customer_id = names.customer_id AND
  clicks.campaign_id = names.campaign_id AND
  clicks.ad_group_id = names.ad_group_id
)
```

### 6. Contracts → First Touch
```sql
FROM raw.itcrm_docs_clients dc
INNER JOIN raw.itcrm_new_source ns ON dc.id_source = ns.id_source
LEFT JOIN stg.fact_leads fl ON ns.id_uniq = fl.client_id
```

---

## ⚠️ ЧАСТЫЕ ОШИБКИ И ИСПРАВЛЕНИЯ

| Ошибка | Правильно |
|--------|-----------|
| `FROM itcrm_new_types nt WHERE nt.id = ...` | `WHERE nt.id_type = ...` |
| `SELECT nt.name` | `SELECT nt.types_descr` |
| `FROM itcrm_events_relations WHERE event = ...` | `WHERE id_event = ...` |
| `FROM itcrm_new_form WHERE form_id = ...` | `WHERE id_form = ...` |
| `SELECT ns.days` (может быть NULL!) | `SELECT ns.date_time::date` |
| `WHERE ns.dogovor = 1` (не работает!) | `JOIN itcrm_docs_clients dc ON ns.id_source = dc.id_source` |
| `FROM fb_campaigns WHERE id = ...` | `WHERE campaign_id = ...` |
| `SELECT fb_ads.name` | `SELECT fb_ads.ad_name` |
| `SUM(cost) FROM google_ads_campaign_daily` | ✅ Правильно (не `spend`!) |
| `attr.fbclid = fb_leads.fbclid` | `attr.fb_lead_id = fb_leads.fb_lead_id` (fb_leads НЕ имеет fbclid в code!) |

---

## 📊 СОЗДАННЫЕ V9 VIEWS

| View Name | Статус | Описание |
|-----------|--------|----------|
| `stg.v9_crm_leads_summary` | ✅ READY | CRM лиды по дням/платформам |
| `stg.v9_crm_contracts_summary` | ✅ READY | CRM договора по дням/платформам |
| `stg.v9_facebook_leads` | ✅ READY | Facebook лиды из raw.fb_leads |
| `stg.fact_leads` | ✅ READY | Финальная таблица лидов с атрибуцией |
| `stg.fact_contracts` | ✅ READY | Финальная таблица договоров с first-touch |

---

**Дата создания**: 22 октября 2025
**Версия**: V9 Final
**Автор**: Claude Code Assistant


-- ============================================================================
-- V9 ANALYTICS: CREATE STG TABLES
-- ============================================================================
-- Цель: Создать таблицы в схеме stg для нормализованных данных
-- Дата: 22 октября 2025
-- ============================================================================

-- ТАБЛИЦА 1: stg.crm_events
-- Цель: Нормализованные события из raw.itcrm_new_source
-- ============================================================================
DROP TABLE IF EXISTS stg.crm_events CASCADE;

CREATE TABLE stg.crm_events (
  -- Основные ключи
  id_source BIGINT PRIMARY KEY,
  client_id BIGINT NOT NULL,

  -- Информация о событии
  event_date TIMESTAMP NOT NULL,
  event_day DATE,
  event_type_id INTEGER,
  event_type_name VARCHAR(200),

  -- Флаги
  is_first_touch BOOLEAN DEFAULT FALSE,
  is_contract BOOLEAN DEFAULT FALSE,
  is_rejection BOOLEAN DEFAULT FALSE,
  is_no_answer BOOLEAN DEFAULT FALSE,

  -- Данные о договоре (если is_contract = TRUE)
  contract_amount NUMERIC(12,2),
  contract_date DATE,

  -- Метаданные
  id_user BIGINT,
  updated_at TIMESTAMP,
  loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Индексы для производительности
  CONSTRAINT crm_events_client_date_unique UNIQUE (client_id, event_date, event_type_id)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_crm_events_client_id ON stg.crm_events (client_id);
CREATE INDEX idx_crm_events_event_date ON stg.crm_events (event_date);
CREATE INDEX idx_crm_events_event_day ON stg.crm_events (event_day);
CREATE INDEX idx_crm_events_is_first_touch ON stg.crm_events (is_first_touch) WHERE is_first_touch = TRUE;
CREATE INDEX idx_crm_events_is_contract ON stg.crm_events (is_contract) WHERE is_contract = TRUE;
CREATE INDEX idx_crm_events_event_type ON stg.crm_events (event_type_id);

COMMENT ON TABLE stg.crm_events IS 'V9: Все события клиентов из CRM с определением первого касания и договоров';

-- ============================================================================
-- ТАБЛИЦА 2: stg.source_attribution
-- Цель: Распарсенные источники трафика для каждого события
-- ============================================================================
DROP TABLE IF EXISTS stg.source_attribution CASCADE;

CREATE TABLE stg.source_attribution (
  id_source BIGINT PRIMARY KEY REFERENCES stg.crm_events(id_source) ON DELETE CASCADE,

  -- Marketing identifiers (из itcrm_analytics.code JSONB)
  fbclid VARCHAR(500),
  fclid VARCHAR(500),
  gclid VARCHAR(500),

  -- UTM parameters
  utm_source VARCHAR(200),
  utm_campaign VARCHAR(500),
  utm_medium VARCHAR(200),
  utm_term VARCHAR(500),
  utm_content VARCHAR(500),

  -- Определенная платформа
  dominant_platform VARCHAR(50),  -- facebook, google, viber, telegram, email, direct, tiktok
  source_type VARCHAR(50),  -- internet_request, event, form, direct

  -- Contact info
  phone VARCHAR(50),
  email VARCHAR(200),

  -- Связи с источниками
  internet_request_id INTEGER,
  event_id INTEGER,
  form_id INTEGER,

  -- Метаданные
  request_created_at TIMESTAMP,
  loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для поиска по маркетинговым меткам
CREATE INDEX idx_source_attr_fbclid ON stg.source_attribution (fbclid) WHERE fbclid IS NOT NULL;
CREATE INDEX idx_source_attr_gclid ON stg.source_attribution (gclid) WHERE gclid IS NOT NULL;
CREATE INDEX idx_source_attr_fclid ON stg.source_attribution (fclid) WHERE fclid IS NOT NULL;
CREATE INDEX idx_source_attr_platform ON stg.source_attribution (dominant_platform);
CREATE INDEX idx_source_attr_utm_source ON stg.source_attribution (utm_source);
CREATE INDEX idx_source_attr_utm_campaign ON stg.source_attribution (utm_campaign);

COMMENT ON TABLE stg.source_attribution IS 'V9: Распарсенные источники трафика (fbclid, gclid, UTM) для каждого события CRM';

-- ============================================================================
-- ТАБЛИЦА 3: stg.marketing_match
-- Цель: Связь CRM событий с конкретными рекламными кампаниями
-- ============================================================================
DROP TABLE IF EXISTS stg.marketing_match CASCADE;

CREATE TABLE stg.marketing_match (
  id_source BIGINT PRIMARY KEY REFERENCES stg.crm_events(id_source) ON DELETE CASCADE,

  -- Определенная платформа после маппинга
  matched_platform VARCHAR(50),  -- facebook, google, null

  -- Facebook details
  fb_campaign_id VARCHAR(100),
  fb_campaign_name VARCHAR(500),
  fb_adset_id VARCHAR(100),
  fb_adset_name VARCHAR(500),
  fb_ad_id VARCHAR(100),
  fb_ad_name VARCHAR(500),

  -- Google details
  google_campaign_id VARCHAR(100),
  google_campaign_name VARCHAR(500),
  google_ad_group_id VARCHAR(100),
  google_ad_group_name VARCHAR(500),

  -- Unified fields (для общих запросов)
  campaign_id VARCHAR(100),
  campaign_name VARCHAR(500),
  ad_id VARCHAR(100),
  ad_name VARCHAR(500),

  -- Метаданные
  matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для JOIN с рекламными данными
CREATE INDEX idx_marketing_match_platform ON stg.marketing_match (matched_platform);
CREATE INDEX idx_marketing_match_campaign_id ON stg.marketing_match (campaign_id);
CREATE INDEX idx_marketing_match_fb_campaign ON stg.marketing_match (fb_campaign_id) WHERE fb_campaign_id IS NOT NULL;
CREATE INDEX idx_marketing_match_google_campaign ON stg.marketing_match (google_campaign_id) WHERE google_campaign_id IS NOT NULL;

COMMENT ON TABLE stg.marketing_match IS 'V9: Связь CRM событий с конкретными рекламными кампаниями Facebook и Google';

-- ============================================================================
-- ТАБЛИЦА 4: stg.fact_leads (финальная таблица лидов)
-- Цель: Единая таблица всех лидов (первые касания) с полной атрибуцией
-- ============================================================================
DROP TABLE IF EXISTS stg.fact_leads CASCADE;

CREATE TABLE stg.fact_leads (
  lead_source_id BIGINT PRIMARY KEY REFERENCES stg.crm_events(id_source) ON DELETE CASCADE,
  client_id BIGINT NOT NULL,

  -- Информация о лиде
  lead_date TIMESTAMP NOT NULL,
  lead_day DATE NOT NULL,
  lead_event_type VARCHAR(200),

  -- Attribution
  dominant_platform VARCHAR(50),
  source_type VARCHAR(50),
  utm_source VARCHAR(200),
  utm_campaign VARCHAR(500),
  utm_medium VARCHAR(200),
  utm_term VARCHAR(500),

  -- Marketing match
  matched_platform VARCHAR(50),
  campaign_id VARCHAR(100),
  campaign_name VARCHAR(500),
  ad_id VARCHAR(100),
  ad_name VARCHAR(500),
  fb_adset_id VARCHAR(100),
  fb_adset_name VARCHAR(500),

  -- Contact info
  phone VARCHAR(50),
  email VARCHAR(200),

  -- Метаданные
  updated_at TIMESTAMP,
  loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для аналитики
CREATE INDEX idx_fact_leads_client_id ON stg.fact_leads (client_id);
CREATE INDEX idx_fact_leads_lead_day ON stg.fact_leads (lead_day);
CREATE INDEX idx_fact_leads_platform ON stg.fact_leads (dominant_platform);
CREATE INDEX idx_fact_leads_campaign ON stg.fact_leads (campaign_id);
CREATE INDEX idx_fact_leads_matched_platform ON stg.fact_leads (matched_platform);

COMMENT ON TABLE stg.fact_leads IS 'V9: Единая таблица всех лидов (первые касания) с полной атрибуцией к источникам';

-- ============================================================================
-- ТАБЛИЦА 5: stg.fact_contracts (финальная таблица договоров)
-- Цель: Единая таблица всех договоров с FIRST TOUCH атрибуцией
-- ============================================================================
DROP TABLE IF EXISTS stg.fact_contracts CASCADE;

CREATE TABLE stg.fact_contracts (
  contract_source_id BIGINT PRIMARY KEY REFERENCES stg.crm_events(id_source) ON DELETE CASCADE,
  client_id BIGINT NOT NULL,

  -- Информация о договоре
  contract_date TIMESTAMP NOT NULL,
  contract_day DATE NOT NULL,
  contract_amount NUMERIC(12,2) NOT NULL,

  -- FIRST TOUCH ATTRIBUTION (критично!)
  lead_source_id BIGINT REFERENCES stg.fact_leads(lead_source_id),
  lead_date TIMESTAMP,
  lead_day DATE,

  -- Attribution (from first touch)
  dominant_platform VARCHAR(50),
  source_type VARCHAR(50),
  utm_source VARCHAR(200),
  utm_campaign VARCHAR(500),
  utm_medium VARCHAR(200),

  -- Marketing match (from first touch)
  matched_platform VARCHAR(50),
  campaign_id VARCHAR(100),
  campaign_name VARCHAR(500),
  ad_id VARCHAR(100),
  ad_name VARCHAR(500),
  fb_adset_id VARCHAR(100),
  fb_adset_name VARCHAR(500),

  -- Conversion metrics
  days_to_contract INTEGER,

  -- Метаданные
  updated_at TIMESTAMP,
  loaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для аналитики договоров
CREATE INDEX idx_fact_contracts_client_id ON stg.fact_contracts (client_id);
CREATE INDEX idx_fact_contracts_contract_day ON stg.fact_contracts (contract_day);
CREATE INDEX idx_fact_contracts_platform ON stg.fact_contracts (dominant_platform);
CREATE INDEX idx_fact_contracts_campaign ON stg.fact_contracts (campaign_id);
CREATE INDEX idx_fact_contracts_lead_source ON stg.fact_contracts (lead_source_id);

COMMENT ON TABLE stg.fact_contracts IS 'V9: Все договоры с FIRST TOUCH атрибуцией к источникам трафика';

-- ============================================================================
-- УСПЕШНО СОЗДАНЫ ВСЕ ТАБЛИЦЫ STG СХЕМЫ
-- ============================================================================
-- Структура:
-- stg.crm_events (события CRM)
--   └─> stg.source_attribution (распарсенные источники)
--   └─> stg.marketing_match (связь с рекламой)
--   └─> stg.fact_leads (лиды с атрибуцией)
--   └─> stg.fact_contracts (договоры с first touch атрибуцией)
-- ============================================================================

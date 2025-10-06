# База Данных Planerix Analytics - Полная Схема

## Оглавление
1. [Общая Структура](#общая-структура)
2. [Основные Таблицы](#основные-таблицы)
3. [Витрины Данных](#витрины-данных)
4. [API Endpoints](#api-endpoints)
5. [Примеры Запросов](#примеры-запросов)

---

## Общая Структура

### Архитектура БД
- **OLTP слой** - операционные таблицы для записи событий
- **OLAP слой** - агрегированные витрины для быстрого чтения
- **Материализованные представления** - для сложных вычислений

### Периодичность обновления
- **Real-time данные** - обновление каждые 5-15 минут
- **Агрегаты за день** - обновление каждый час
- **Исторические данные** - обновление раз в сутки

---

## Основные Таблицы

### 1. Справочники (Reference Tables)

#### `products` - Продукты
\`\`\`sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10, 2),
    duration_months INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Пример данных
INSERT INTO products (name, category, price, duration_months) VALUES
('Курс Front-end', 'Programming', 4800, 6),
('Курс Тестування ПЗ (QA)', 'Testing', 4200, 5),
('IT Start для дітей 7-8 років', 'Kids', 2800, 3);
\`\`\`

**Используется в компонентах:**
- Filters (все страницы)
- AdvancedFilters
- DataTables (все страницы)
- Product Performance Charts

---

#### `branches` - Филиалы
\`\`\`sql
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Пример данных
INSERT INTO branches (name, city, region, address) VALUES
('IT STEP Київ', 'Київ', 'Київська область', 'вул. Хрещатик, 15'),
('IT STEP Дніпро', 'Дніпро', 'Дніпропетровська область', 'просп. Яворницького, 58');
\`\`\`

**Используется в компонентах:**
- Filters (все страницы)
- Branch Performance Cards
- GeoMap
- TopPerformers

---

#### `traffic_sources` - Источники трафика
\`\`\`sql
CREATE TABLE traffic_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50), -- 'paid', 'organic', 'direct', 'referral'
    platform VARCHAR(50), -- 'Facebook', 'Google', 'Instagram', etc.
    is_active BOOLEAN DEFAULT true
);

-- Пример данных
INSERT INTO traffic_sources (name, type, platform) VALUES
('Facebook', 'paid', 'Facebook'),
('Google Ads', 'paid', 'Google'),
('Instagram', 'paid', 'Instagram'),
('Organic', 'organic', 'Google'),
('Direct', 'direct', NULL);
\`\`\`

**Используется в компонентах:**
- Filters
- TrafficChart
- EngagementChart
- Source Performance Tables

---

### 2. Креативы и Кампании

#### `campaigns` - Кампании
\`\`\`sql
CREATE TABLE campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    product_id INTEGER REFERENCES products(id),
    branch_id INTEGER REFERENCES branches(id),
    source_id INTEGER REFERENCES traffic_sources(id),
    objective VARCHAR(50), -- 'conversions', 'traffic', 'brand_awareness'
    status VARCHAR(50), -- 'active', 'paused', 'completed'
    budget DECIMAL(10, 2),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaigns_product ON campaigns(product_id);
CREATE INDEX idx_campaigns_branch ON campaigns(branch_id);
CREATE INDEX idx_campaigns_source ON campaigns(source_id);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
\`\`\`

**Используется в компонентах:**
- `/campaigns` страница
- CampaignPerformanceTable
- AI Insights - Campaigns

**API Endpoint:** `GET /api/campaigns`

---

#### `creatives` - Креативы
\`\`\`sql
CREATE TABLE creatives (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50), -- 'video', 'image', 'carousel', 'collection'
    platform VARCHAR(50),
    product_id INTEGER REFERENCES products(id),
    branch_id INTEGER REFERENCES branches(id),
    
    -- Текстовый контент
    title TEXT,
    body TEXT,
    call_to_action VARCHAR(100),
    link_url TEXT,
    
    -- Медиа
    media_url TEXT,
    thumbnail_url TEXT,
    
    -- Статус
    status VARCHAR(50), -- 'active', 'paused', 'archived'
    is_personalized BOOLEAN DEFAULT false,
    
    -- Метаданные
    theme VARCHAR(100), -- 'career', 'money', 'change', 'certificates', etc.
    target_audience VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_creatives_campaign ON creatives(campaign_id);
CREATE INDEX idx_creatives_product ON creatives(product_id);
CREATE INDEX idx_creatives_theme ON creatives(theme);
CREATE INDEX idx_creatives_status ON creatives(status);
\`\`\`

**Используется в компонентах:**
- `/creatives` страница
- CreativeBurnoutIndicator
- ThemeAnalysis
- PersonalizationComparison

**API Endpoint:** `GET /api/creatives`

---

### 3. Метрики и Статистика

#### `creative_daily_stats` - Ежедневная статистика креативов
\`\`\`sql
CREATE TABLE creative_daily_stats (
    id SERIAL PRIMARY KEY,
    creative_id INTEGER REFERENCES creatives(id),
    date DATE NOT NULL,
    
    -- Базовые метрики
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    frequency DECIMAL(5, 2) DEFAULT 0,
    
    -- Конверсии
    conversions INTEGER DEFAULT 0,
    leads INTEGER DEFAULT 0,
    purchases INTEGER DEFAULT 0,
    
    -- Финансовые метрики
    spend DECIMAL(10, 2) DEFAULT 0,
    revenue DECIMAL(10, 2) DEFAULT 0,
    
    -- Расчетные метрики
    ctr DECIMAL(5, 2), -- Click-through rate
    cpc DECIMAL(10, 2), -- Cost per click
    cpa DECIMAL(10, 2), -- Cost per acquisition
    cpm DECIMAL(10, 2), -- Cost per mille
    roas DECIMAL(10, 2), -- Return on ad spend
    cvr DECIMAL(5, 2), -- Conversion rate
    
    -- Engagement метрики
    engagement_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5, 2),
    
    -- Видео метрики (если применимо)
    video_views INTEGER,
    video_view_rate DECIMAL(5, 2),
    avg_watch_time INTEGER, -- в секундах
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(creative_id, date)
);

CREATE INDEX idx_creative_stats_date ON creative_daily_stats(date);
CREATE INDEX idx_creative_stats_creative ON creative_daily_stats(creative_id);
CREATE INDEX idx_creative_stats_performance ON creative_daily_stats(roas DESC, ctr DESC);
\`\`\`

**Используется в компонентах:**
- CreativeBurnoutIndicator (график за 30-42 дня)
- Creative Performance Tables
- Performance Charts

**API Endpoint:** `GET /api/creatives/{id}/stats?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`

---

#### `campaign_daily_stats` - Ежедневная статистика кампаний
\`\`\`sql
CREATE TABLE campaign_daily_stats (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id),
    date DATE NOT NULL,
    
    -- Базовые метрики
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    
    -- Конверсии по воронке
    landing_page_views INTEGER DEFAULT 0,
    form_submissions INTEGER DEFAULT 0,
    phone_calls INTEGER DEFAULT 0,
    consultations INTEGER DEFAULT 0,
    contracts_signed INTEGER DEFAULT 0,
    
    -- Финансовые метрики
    spend DECIMAL(10, 2) DEFAULT 0,
    revenue DECIMAL(10, 2) DEFAULT 0,
    
    -- Расчетные метрики
    ctr DECIMAL(5, 2),
    cpc DECIMAL(10, 2),
    cpa DECIMAL(10, 2),
    roas DECIMAL(10, 2),
    conversion_rate DECIMAL(5, 2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(campaign_id, date)
);

CREATE INDEX idx_campaign_stats_date ON campaign_daily_stats(date);
CREATE INDEX idx_campaign_stats_campaign ON campaign_daily_stats(campaign_id);
\`\`\`

**Используется в компонентах:**
- `/campaigns` страница
- Campaign Performance Charts
- AI Insights - Campaigns

**API Endpoint:** `GET /api/campaigns/{id}/stats`

---

### 4. Воронка и Конверсии

#### `funnel_events` - События воронки
\`\`\`sql
CREATE TABLE funnel_events (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255), -- анонимный ID пользователя
    session_id VARCHAR(255),
    
    campaign_id INTEGER REFERENCES campaigns(id),
    creative_id INTEGER REFERENCES creatives(id),
    product_id INTEGER REFERENCES products(id),
    branch_id INTEGER REFERENCES branches(id),
    
    event_type VARCHAR(50), -- 'impression', 'click', 'page_view', 'lead', etc.
    event_stage VARCHAR(50), -- 'awareness', 'consideration', 'conversion'
    
    -- UTM метки
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_content VARCHAR(100),
    utm_term VARCHAR(100),
    
    -- Метаданные
    device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(50),
    os VARCHAR(50),
    
    -- Геолокация
    country VARCHAR(100),
    city VARCHAR(100),
    
    -- Дополнительные данные
    page_url TEXT,
    referrer_url TEXT,
    
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_funnel_events_user ON funnel_events(user_id);
CREATE INDEX idx_funnel_events_session ON funnel_events(session_id);
CREATE INDEX idx_funnel_events_campaign ON funnel_events(campaign_id);
CREATE INDEX idx_funnel_events_creative ON funnel_events(creative_id);
CREATE INDEX idx_funnel_events_type ON funnel_events(event_type);
CREATE INDEX idx_funnel_events_timestamp ON funnel_events(event_timestamp);
\`\`\`

**Используется в компонентах:**
- `/funnel` страница
- Funnel Visualization
- Stage Conversion Analysis

**API Endpoint:** `GET /api/funnel/events`

---

#### `leads` - Лиды (CRM)
\`\`\`sql
CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    
    -- Идентификация
    external_id VARCHAR(100), -- ID из внешней CRM
    
    -- Персональные данные
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    
    -- Демография
    age INTEGER,
    gender VARCHAR(20),
    city VARCHAR(100),
    
    -- Источник
    source_id INTEGER REFERENCES traffic_sources(id),
    campaign_id INTEGER REFERENCES campaigns(id),
    creative_id INTEGER REFERENCES creatives(id),
    
    -- UTM метки
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_content VARCHAR(100),
    
    -- Продукт и филиал
    product_id INTEGER REFERENCES products(id),
    branch_id INTEGER REFERENCES branches(id),
    
    -- Оценка лида
    lead_score INTEGER, -- 0-100
    temperature VARCHAR(20), -- 'hot', 'warm', 'cold'
    
    -- Статус
    status VARCHAR(50), -- 'new', 'contacted', 'qualified', 'converted', 'lost'
    stage VARCHAR(50), -- 'lead', 'prospect', 'student', 'graduate'
    
    -- Финансы
    contract_value DECIMAL(10, 2),
    payment_status VARCHAR(50),
    discount DECIMAL(5, 2),
    
    -- Временные метки
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_contact_at TIMESTAMP,
    converted_at TIMESTAMP,
    
    -- Примечания
    notes TEXT
);

CREATE INDEX idx_leads_product ON leads(product_id);
CREATE INDEX idx_leads_branch ON leads(branch_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_temperature ON leads(temperature);
CREATE INDEX idx_leads_campaign ON leads(campaign_id);
CREATE INDEX idx_leads_created ON leads(created_at);
\`\`\`

**Используется в компонентах:**
- `/crm` страница
- Lead Details Cards
- Temperature Analysis

**API Endpoint:** `GET /api/leads`

---

#### `lead_interactions` - Взаимодействия с лидами
\`\`\`sql
CREATE TABLE lead_interactions (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    
    type VARCHAR(50), -- 'form_submission', 'phone_call', 'email', 'consultation', 'contract_signed'
    details TEXT,
    outcome VARCHAR(50),
    
    duration INTEGER, -- в секундах (для звонков, консультаций)
    
    user_id INTEGER, -- ID менеджера
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interactions_lead ON lead_interactions(lead_id);
CREATE INDEX idx_interactions_type ON lead_interactions(type);
CREATE INDEX idx_interactions_date ON lead_interactions(created_at);
\`\`\`

**Используется в компонентах:**
- Lead Detail View
- Interaction Timeline
- Conversion Analysis

**API Endpoint:** `GET /api/leads/{id}/interactions`

---

### 5. Трафик и Поведение

#### `traffic_sessions` - Сессии трафика
\`\`\`sql
CREATE TABLE traffic_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255),
    
    -- Источник
    source_id INTEGER REFERENCES traffic_sources(id),
    campaign_id INTEGER REFERENCES campaigns(id),
    
    -- UTM параметры
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    
    -- Параметры сессии
    device_type VARCHAR(50),
    browser VARCHAR(50),
    os VARCHAR(50),
    
    -- Геолокация
    country VARCHAR(100),
    city VARCHAR(100),
    
    -- Метрики сессии
    page_views INTEGER DEFAULT 0,
    duration INTEGER, -- в секундах
    bounce BOOLEAN DEFAULT false,
    
    -- Конверсии
    converted BOOLEAN DEFAULT false,
    conversion_type VARCHAR(50),
    
    -- Временные метки
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_source ON traffic_sessions(source_id);
CREATE INDEX idx_sessions_campaign ON traffic_sessions(campaign_id);
CREATE INDEX idx_sessions_device ON traffic_sessions(device_type);
CREATE INDEX idx_sessions_city ON traffic_sessions(city);
CREATE INDEX idx_sessions_date ON traffic_sessions(started_at);
\`\`\`

**Используется в компонентах:**
- `/traffic` страница
- TrafficChart
- Device Performance
- GeoMap

**API Endpoint:** `GET /api/traffic/sessions`

---

## Витрины Данных (Materialized Views)

### 1. Витрина для главной страницы

#### `mv_overview_metrics` - Общие метрики
\`\`\`sql
CREATE MATERIALIZED VIEW mv_overview_metrics AS
SELECT 
    DATE_TRUNC('day', date) as date,
    
    -- Финансовые метрики
    SUM(revenue) as total_revenue,
    SUM(spend) as total_spend,
    AVG(roas) as avg_roas,
    
    -- Проекты и команда (пример)
    COUNT(DISTINCT campaign_id) as active_projects,
    
    -- Конверсия
    AVG(conversion_rate) as avg_conversion_rate,
    
    -- Изменения (за предыдущий период)
    LAG(SUM(revenue)) OVER (ORDER BY DATE_TRUNC('day', date)) as prev_revenue,
    LAG(AVG(conversion_rate)) OVER (ORDER BY DATE_TRUNC('day', date)) as prev_conversion
FROM campaign_daily_stats
WHERE date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', date)
ORDER BY date DESC;

CREATE UNIQUE INDEX idx_mv_overview_date ON mv_overview_metrics(date);
\`\`\`

**Обновление:** Каждый час
\`\`\`sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_overview_metrics;
\`\`\`

**Используется в компонентах:**
- MetricCard (главная страница)
- Real-time Metrics
- Performance Indicators

**API Endpoint:** `GET /api/overview/metrics`

---

### 2. Витрина для воронки

#### `mv_funnel_analysis` - Анализ воронки
\`\`\`sql
CREATE MATERIALIZED VIEW mv_funnel_analysis AS
WITH funnel_stages AS (
    SELECT 
        product_id,
        branch_id,
        source_id,
        DATE_TRUNC('day', event_timestamp) as date,
        
        -- Подсчет событий по этапам
        COUNT(CASE WHEN event_type = 'impression' THEN 1 END) as impressions,
        COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks,
        COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as landing_views,
        COUNT(CASE WHEN event_type = 'lead' THEN 1 END) as leads,
        COUNT(CASE WHEN event_type = 'phone_call' THEN 1 END) as calls,
        COUNT(CASE WHEN event_type = 'consultation' THEN 1 END) as consultations,
        COUNT(CASE WHEN event_type = 'purchase' THEN 1 END) as purchases
    FROM funnel_events
    WHERE event_timestamp >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY product_id, branch_id, source_id, DATE_TRUNC('day', event_timestamp)
)
SELECT 
    date,
    product_id,
    branch_id,
    source_id,
    
    -- Абсолютные значения
    impressions,
    clicks,
    landing_views,
    leads,
    calls,
    consultations,
    purchases,
    
    -- Конверсия между этапами
    CASE WHEN impressions > 0 THEN (clicks::DECIMAL / impressions * 100) ELSE 0 END as click_rate,
    CASE WHEN clicks > 0 THEN (landing_views::DECIMAL / clicks * 100) ELSE 0 END as landing_rate,
    CASE WHEN landing_views > 0 THEN (leads::DECIMAL / landing_views * 100) ELSE 0 END as lead_rate,
    CASE WHEN leads > 0 THEN (calls::DECIMAL / leads * 100) ELSE 0 END as call_rate,
    CASE WHEN calls > 0 THEN (consultations::DECIMAL / calls * 100) ELSE 0 END as consultation_rate,
    CASE WHEN consultations > 0 THEN (purchases::DECIMAL / consultations * 100) ELSE 0 END as purchase_rate,
    
    -- Общая конверсия
    CASE WHEN impressions > 0 THEN (purchases::DECIMAL / impressions * 100) ELSE 0 END as overall_conversion
FROM funnel_stages;

CREATE INDEX idx_mv_funnel_date ON mv_funnel_analysis(date);
CREATE INDEX idx_mv_funnel_product ON mv_funnel_analysis(product_id);
CREATE INDEX idx_mv_funnel_branch ON mv_funnel_analysis(branch_id);
\`\`\`

**Используется в компонентах:**
- `/funnel` страница
- Funnel Visualization
- Product Funnel Comparison

**API Endpoint:** `GET /api/funnel/analysis`

---

### 3. Витрина для креативов

#### `mv_creative_performance` - Производительность креативов
\`\`\`sql
CREATE MATERIALIZED VIEW mv_creative_performance AS
SELECT 
    c.id as creative_id,
    c.name,
    c.type,
    c.platform,
    c.theme,
    c.is_personalized,
    c.product_id,
    c.branch_id,
    
    -- Последние 7 дней
    SUM(CASE WHEN cds.date >= CURRENT_DATE - 7 THEN cds.impressions ELSE 0 END) as impressions_7d,
    SUM(CASE WHEN cds.date >= CURRENT_DATE - 7 THEN cds.clicks ELSE 0 END) as clicks_7d,
    AVG(CASE WHEN cds.date >= CURRENT_DATE - 7 THEN cds.ctr ELSE NULL END) as ctr_7d,
    AVG(CASE WHEN cds.date >= CURRENT_DATE - 7 THEN cds.roas ELSE NULL END) as roas_7d,
    
    -- Последние 30 дней
    SUM(CASE WHEN cds.date >= CURRENT_DATE - 30 THEN cds.impressions ELSE 0 END) as impressions_30d,
    SUM(CASE WHEN cds.date >= CURRENT_DATE - 30 THEN cds.clicks ELSE 0 END) as clicks_30d,
    AVG(CASE WHEN cds.date >= CURRENT_DATE - 30 THEN cds.ctr ELSE NULL END) as ctr_30d,
    AVG(CASE WHEN cds.date >= CURRENT_DATE - 30 THEN cds.roas ELSE NULL END) as roas_30d,
    AVG(CASE WHEN cds.date >= CURRENT_DATE - 30 THEN cds.cpa ELSE NULL END) as cpa_30d,
    
    -- Начальные значения (первые 7 дней)
    AVG(CASE WHEN cds.date BETWEEN c.created_at::DATE AND c.created_at::DATE + 7 THEN cds.ctr ELSE NULL END) as initial_ctr,
    AVG(CASE WHEN cds.date BETWEEN c.created_at::DATE AND c.created_at::DATE + 7 THEN cds.roas ELSE NULL END) as initial_roas,
    
    -- Индекс выгорания (чем выше, тем хуже)
    CASE 
        WHEN AVG(CASE WHEN cds.date BETWEEN c.created_at::DATE AND c.created_at::DATE + 7 THEN cds.ctr ELSE NULL END) > 0
        THEN (1 - AVG(CASE WHEN cds.date >= CURRENT_DATE - 7 THEN cds.ctr ELSE NULL END) / 
              AVG(CASE WHEN cds.date BETWEEN c.created_at::DATE AND c.created_at::DATE + 7 THEN cds.ctr ELSE NULL END)) * 100
        ELSE 0 
    END as burnout_score,
    
    -- Общая статистика
    SUM(cds.spend) as total_spend,
    SUM(cds.revenue) as total_revenue,
    SUM(cds.conversions) as total_conversions,
    
    -- Дни активности
    COUNT(DISTINCT cds.date) as days_active,
    MAX(cds.date) as last_active_date
    
FROM creatives c
LEFT JOIN creative_daily_stats cds ON c.id = cds.creative_id
WHERE c.status = 'active'
GROUP BY c.id, c.name, c.type, c.platform, c.theme, c.is_personalized, c.product_id, c.branch_id;

CREATE INDEX idx_mv_creative_perf_id ON mv_creative_performance(creative_id);
CREATE INDEX idx_mv_creative_perf_burnout ON mv_creative_performance(burnout_score DESC);
CREATE INDEX idx_mv_creative_perf_theme ON mv_creative_performance(theme);
\`\`\`

**Используется в компонентах:**
- CreativeBurnoutIndicator
- Creative Performance Tables
- ThemeAnalysis

**API Endpoint:** `GET /api/creatives/performance`

---

### 4. Витрина для персонализации

#### `mv_personalization_comparison` - Сравнение персонализации
\`\`\`sql
CREATE MATERIALIZED VIEW mv_personalization_comparison AS
WITH audience_segments AS (
    SELECT 
        CASE 
            WHEN l.age BETWEEN 18 AND 24 THEN 'Студенти 18-24'
            WHEN l.age BETWEEN 25 AND 34 THEN 'Молоді професіонали 25-34'
            WHEN l.age BETWEEN 30 AND 45 THEN 'Батьки 30-45'
            WHEN l.age >= 45 THEN 'Досвідчені 45+'
            ELSE 'Інші'
        END as audience,
        c.is_personalized,
        AVG(cds.ctr) as avg_ctr,
        AVG(cds.cvr) as avg_cvr,
        AVG(cds.cpa) as avg_cpa,
        SUM(cds.revenue) as total_revenue,
        COUNT(*) as sample_size
    FROM creatives c
    JOIN creative_daily_stats cds ON c.id = cds.creative_id
    LEFT JOIN leads l ON l.creative_id = c.id
    WHERE cds.date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY audience, c.is_personalized
)
SELECT 
    audience,
    
    -- Персонализированные
    MAX(CASE WHEN is_personalized = true THEN avg_ctr ELSE NULL END) as personalized_ctr,
    MAX(CASE WHEN is_personalized = true THEN avg_cvr ELSE NULL END) as personalized_cvr,
    MAX(CASE WHEN is_personalized = true THEN avg_cpa ELSE NULL END) as personalized_cpa,
    MAX(CASE WHEN is_personalized = true THEN total_revenue ELSE NULL END) as personalized_revenue,
    
    -- Стандартные
    MAX(CASE WHEN is_personalized = false THEN avg_ctr ELSE NULL END) as standard_ctr,
    MAX(CASE WHEN is_personalized = false THEN avg_cvr ELSE NULL END) as standard_cvr,
    MAX(CASE WHEN is_personalized = false THEN avg_cpa ELSE NULL END) as standard_cpa,
    MAX(CASE WHEN is_personalized = false THEN total_revenue ELSE NULL END) as standard_revenue,
    
    -- Улучшение
    CASE 
        WHEN MAX(CASE WHEN is_personalized = false THEN avg_ctr ELSE NULL END) > 0
        THEN ((MAX(CASE WHEN is_personalized = true THEN avg_ctr ELSE NULL END) - 
               MAX(CASE WHEN is_personalized = false THEN avg_ctr ELSE NULL END)) / 
               MAX(CASE WHEN is_personalized = false THEN avg_ctr ELSE NULL END) * 100)
        ELSE 0
    END as ctr_improvement
    
FROM audience_segments
GROUP BY audience;

CREATE INDEX idx_mv_personalization_audience ON mv_personalization_comparison(audience);
\`\`\`

**Используется в компонентах:**
- PersonalizationComparison
- Audience Performance Analysis

**API Endpoint:** `GET /api/creatives/personalization`

---

### 5. Витрина для тематического анализа

#### `mv_theme_analysis` - Анализ тематик
\`\`\`sql
CREATE MATERIALIZED VIEW mv_theme_analysis AS
SELECT 
    c.theme,
    COUNT(DISTINCT c.id) as creatives_count,
    
    -- Средние показатели
    AVG(cds.ctr) as avg_ctr,
    AVG(cds.cvr) as avg_cvr,
    AVG(cds.cpa) as avg_cpa,
    AVG(cds.roas) as avg_roas,
    
    -- Суммарные показатели
    SUM(cds.revenue) as total_revenue,
    SUM(cds.spend) as total_spend,
    SUM(cds.conversions) as total_conversions,
    
    -- Лучшая аудитория для темы
    MODE() WITHIN GROUP (ORDER BY 
        CASE 
            WHEN l.age BETWEEN 18 AND 24 THEN 'Студенти 18-24'
            WHEN l.age BETWEEN 25 AND 34 THEN 'Молоді професіонали 25-34'
            WHEN l.age BETWEEN 30 AND 45 THEN 'Батьки 30-45'
            ELSE 'Інші'
        END
    ) as top_audience,
    
    -- Лучшая платформа для темы
    MODE() WITHIN GROUP (ORDER BY c.platform) as best_platform
    
FROM creatives c
JOIN creative_daily_stats cds ON c.id = cds.creative_id
LEFT JOIN leads l ON l.creative_id = c.id
WHERE cds.date >= CURRENT_DATE - INTERVAL '90 days'
    AND c.theme IS NOT NULL
GROUP BY c.theme;

CREATE INDEX idx_mv_theme_theme ON mv_theme_analysis(theme);
CREATE INDEX idx_mv_theme_roas ON mv_theme_analysis(avg_roas DESC);
\`\`\`

**Используется в компонентах:**
- ThemeAnalysis
- Theme Performance Charts

**API Endpoint:** `GET /api/creatives/themes`

---

### 6. Витрина для трафика

#### `mv_traffic_analysis` - Анализ трафика
\`\`\`sql
CREATE MATERIALIZED VIEW mv_traffic_analysis AS
SELECT 
    DATE_TRUNC('day', ts.started_at) as date,
    ts.source_id,
    ts.device_type,
    ts.city,
    
    -- Метрики сессий
    COUNT(*) as sessions,
    COUNT(DISTINCT ts.user_id) as users,
    COUNT(CASE WHEN ts.bounce = false THEN 1 END) as engaged_sessions,
    AVG(ts.duration) as avg_duration,
    AVG(ts.page_views) as avg_page_views,
    
    -- Bounce rate
    (COUNT(CASE WHEN ts.bounce = true THEN 1 END)::DECIMAL / COUNT(*) * 100) as bounce_rate,
    
    -- Конверсии
    COUNT(CASE WHEN ts.converted = true THEN 1 END) as conversions,
    (COUNT(CASE WHEN ts.converted = true THEN 1 END)::DECIMAL / COUNT(*) * 100) as conversion_rate,
    
    -- Revenue (from leads table)
    COALESCE(SUM(l.contract_value), 0) as revenue
    
FROM traffic_sessions ts
LEFT JOIN leads l ON l.external_id = ts.session_id AND l.converted_at IS NOT NULL
WHERE ts.started_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', ts.started_at), ts.source_id, ts.device_type, ts.city;

CREATE INDEX idx_mv_traffic_date ON mv_traffic_analysis(date);
CREATE INDEX idx_mv_traffic_source ON mv_traffic_analysis(source_id);
CREATE INDEX idx_mv_traffic_device ON mv_traffic_analysis(device_type);
CREATE INDEX idx_mv_traffic_city ON mv_traffic_analysis(city);
\`\`\`

**Используется в компонентах:**
- `/traffic` страница
- TrafficChart
- DevicePerformance
- GeoMap

**API Endpoint:** `GET /api/traffic/analysis`

---

### 7. Витрина для CRM

#### `mv_lead_scoring` - Скоринг лидов
\`\`\`sql
CREATE MATERIALIZED VIEW mv_lead_scoring AS
SELECT 
    l.id as lead_id,
    l.product_id,
    l.branch_id,
    l.source_id,
    l.temperature,
    l.status,
    
    -- Расчет скоринга
    (
        -- Вовлеченность (40 баллов)
        CASE 
            WHEN COUNT(li.id) >= 5 THEN 40
            WHEN COUNT(li.id) >= 3 THEN 30
            WHEN COUNT(li.id) >= 1 THEN 20
            ELSE 0
        END +
        
        -- Скорость реакции (30 баллов)
        CASE 
            WHEN EXTRACT(EPOCH FROM (l.last_contact_at - l.created_at))/3600 <= 24 THEN 30
            WHEN EXTRACT(EPOCH FROM (l.last_contact_at - l.created_at))/3600 <= 72 THEN 20
            WHEN EXTRACT(EPOCH FROM (l.last_contact_at - l.created_at))/3600 <= 168 THEN 10
            ELSE 0
        END +
        
        -- Качество источника (30 баллов)
        CASE 
            WHEN ts.name IN ('Facebook', 'Google Ads') THEN 30
            WHEN ts.name IN ('Instagram', 'YouTube') THEN 20
            ELSE 10
        END
    ) as calculated_score,
    
    -- Рекомендуемая температура
    CASE 
        WHEN calculated_score >= 80 THEN 'hot'
        WHEN calculated_score >= 60 THEN 'warm'
        ELSE 'cold'
    END as recommended_temperature,
    
    -- Дни с момента создания
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - l.created_at))/86400 as days_since_created,
    
    -- Количество взаимодействий
    COUNT(li.id) as interaction_count
    
FROM leads l
LEFT JOIN lead_interactions li ON l.id = li.lead_id
LEFT JOIN traffic_sources ts ON l.source_id = ts.id
WHERE l.status NOT IN ('converted', 'lost')
GROUP BY l.id, l.product_id, l.branch_id, l.source_id, l.temperature, 
         l.status, l.created_at, l.last_contact_at, ts.name;

CREATE INDEX idx_mv_lead_scoring_id ON mv_lead_scoring(lead_id);
CREATE INDEX idx_mv_lead_scoring_score ON mv_lead_scoring(calculated_score DESC);
CREATE INDEX idx_mv_lead_scoring_temp ON mv_lead_scoring(recommended_temperature);
\`\`\`

**Используется в компонентах:**
- `/crm` страница
- Lead Details
- Temperature Analysis

**API Endpoint:** `GET /api/leads/scoring`

---

### 8. Витрина для целей

#### `mv_goal_progress` - Прогресс по целям
\`\`\`sql
CREATE TABLE goals (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    priority VARCHAR(20), -- 'high', 'medium', 'low'
    product_id INTEGER REFERENCES products(id),
    branch_id INTEGER REFERENCES branches(id),
    
    -- Метрики
    target_type VARCHAR(50), -- 'revenue', 'leads', 'conversions', etc.
    target_value DECIMAL(10, 2),
    current_value DECIMAL(10, 2) DEFAULT 0,
    
    -- Даты
    start_date DATE,
    deadline DATE,
    
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE MATERIALIZED VIEW mv_goal_progress AS
SELECT 
    g.id as goal_id,
    g.title,
    g.department,
    g.priority,
    g.product_id,
    g.branch_id,
    g.target_type,
    g.target_value,
    
    -- Текущее значение (динамически рассчитывается)
    CASE g.target_type
        WHEN 'revenue' THEN COALESCE(SUM(cds.revenue), 0)
        WHEN 'leads' THEN COALESCE(COUNT(l.id), 0)
        WHEN 'conversions' THEN COALESCE(SUM(cds.conversions), 0)
        ELSE 0
    END as current_value,
    
    -- Прогресс в процентах
    CASE 
        WHEN g.target_value > 0 THEN 
            (CASE g.target_type
                WHEN 'revenue' THEN COALESCE(SUM(cds.revenue), 0)
                WHEN 'leads' THEN COALESCE(COUNT(l.id), 0)
                WHEN 'conversions' THEN COALESCE(SUM(cds.conversions), 0)
                ELSE 0
            END / g.target_value * 100)
        ELSE 0
    END as progress_percentage,
    
    -- Дни до дедлайна
    EXTRACT(DAY FROM (g.deadline - CURRENT_DATE)) as days_remaining,
    
    -- Необходимый темп
    CASE 
        WHEN EXTRACT(DAY FROM (g.deadline - CURRENT_DATE)) > 0 THEN
            (g.target_value - current_value) / EXTRACT(DAY FROM (g.deadline - CURRENT_DATE))
        ELSE 0
    END as required_daily_pace
    
FROM goals g
LEFT JOIN campaign_daily_stats cds ON (
    (g.product_id IS NULL OR cds.campaign_id IN (SELECT id FROM campaigns WHERE product_id = g.product_id))
    AND cds.date BETWEEN g.start_date AND CURRENT_DATE
)
LEFT JOIN leads l ON (
    (g.product_id IS NULL OR l.product_id = g.product_id)
    AND (g.branch_id IS NULL OR l.branch_id = g.branch_id)
    AND l.created_at BETWEEN g.start_date AND CURRENT_DATE
)
WHERE g.status = 'active'
GROUP BY g.id, g.title, g.department, g.priority, g.product_id, g.branch_id, 
         g.target_type, g.target_value, g.start_date, g.deadline;

CREATE INDEX idx_mv_goal_progress_id ON mv_goal_progress(goal_id);
CREATE INDEX idx_mv_goal_progress_progress ON mv_goal_progress(progress_percentage DESC);
\`\`\`

**Используется в компонентах:**
- ActiveGoals
- Goal Progress Cards

**API Endpoint:** `GET /api/goals`

---

## API Endpoints - Детальная Спецификация

### Главная страница - `/`

#### 1. GET `/api/overview/metrics`
\`\`\`json
{
  "date": "2025-08-09",
  "revenue": {
    "total": 2400000,
    "change": 12.5,
    "change_type": "positive"
  },
  "projects": {
    "total": 24,
    "change": 8.2,
    "change_type": "positive"
  },
  "team": {
    "total": 48,
    "change": -2.1,
    "change_type": "negative"
  },
  "conversion": {
    "total": 18.4,
    "change": 5.7,
    "change_type": "positive"
  }
}
\`\`\`

**SQL запрос:**
\`\`\`sql
SELECT 
    date,
    total_revenue as revenue_total,
    (total_revenue - prev_revenue) / prev_revenue * 100 as revenue_change,
    active_projects as projects_total,
    avg_conversion_rate as conversion_total
FROM mv_overview_metrics
WHERE date = CURRENT_DATE
LIMIT 1;
\`\`\`

---

#### 2. GET `/api/overview/realtime`
\`\`\`json
{
  "timestamp": "2025-08-09T14:30:00Z",
  "active_sessions": 1247,
  "new_leads": 23,
  "revenue_today": 15680,
  "clicks": 892,
  "impressions": 45230,
  "calls": 18
}
\`\`\`

**SQL запрос:**
\`\`\`sql
SELECT 
    COUNT(DISTINCT session_id) as active_sessions,
    COUNT(DISTINCT CASE WHEN event_type = 'lead' THEN user_id END) as new_leads,
    SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) as clicks,
    SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) as impressions
FROM funnel_events
WHERE event_timestamp >= CURRENT_DATE
    AND event_timestamp >= NOW() - INTERVAL '15 minutes';

-- Revenue
SELECT SUM(contract_value) as revenue_today
FROM leads
WHERE created_at >= CURRENT_DATE;
\`\`\`

---

#### 3. GET `/api/overview/kpis`
\`\`\`json
{
  "kpis": [
    {
      "name": "ROAS",
      "current": 4.2,
      "target": 4.0,
      "previous": 3.8,
      "unit": "",
      "format": "number"
    },
    {
      "name": "CPA",
      "current": 68,
      "target": 75,
      "previous": 72,
      "unit": "$",
      "format": "currency"
    }
  ]
}
\`\`\`

---

### Страница воронки - `/funnel`

#### 1. GET `/api/funnel/analysis`
**Query params:**
- `product_id` (optional)
- `branch_id` (optional)
- `source_id` (optional)
- `start_date` (optional)
- `end_date` (optional)

\`\`\`json
{
  "funnel": [
    {
      "stage": "Impressions",
      "count": 125000,
      "percentage": 100,
      "dropoff_rate": 0
    },
    {
      "stage": "Clicks",
      "count": 6500,
      "percentage": 5.2,
      "dropoff_rate": 94.8
    },
    {
      "stage": "Landing Page Views",
      "count": 5850,
      "percentage": 90.0,
      "dropoff_rate": 10.0
    }
  ],
  "by_product": [
    {
      "product_id": 1,
      "product_name": "Курс Front-end",
      "branch": "Київ",
      "source": "Facebook",
      "impressions": 125000,
      "clicks": 6500,
      "leads": 850,
      "contracts": 95,
      "conversion_rate": 0.076,
      "revenue": 38250,
      "roas": 4.48
    }
  ]
}
\`\`\`

**SQL запрос:**
\`\`\`sql
-- Общая воронка
SELECT 
    'Impressions' as stage,
    impressions as count,
    100.0 as percentage,
    0 as dropoff_rate
FROM mv_funnel_analysis
WHERE date >= :start_date AND date <= :end_date
    AND (:product_id IS NULL OR product_id = :product_id)
    AND (:branch_id IS NULL OR branch_id = :branch_id)
    AND (:source_id IS NULL OR source_id = :source_id)

UNION ALL

SELECT 
    'Clicks' as stage,
    clicks as count,
    click_rate as percentage,
    100 - click_rate as dropoff_rate
FROM mv_funnel_analysis
-- ... аналогично для других этапов
\`\`\`

---

#### 2. GET `/api/funnel/detailed`
\`\`\`json
{
  "stages": [
    {
      "stage": "Form Submissions",
      "product": "Курс Front-end",
      "branch": "Київ",
      "count": 850,
      "percentage": 14.5,
      "dropoff_rate": 85.5,
      "avg_time_in_stage": 180,
      "top_exit_reasons": [
        "Too many fields",
        "No trust signals"
      ]
    }
  ]
}
\`\`\`

---

### Страница кампаний - `/campaigns`

#### 1. GET `/api/campaigns`
**Query params:**
- `product_id` (optional)
- `branch_id` (optional)
- `source_id` (optional)
- `status` (optional)

\`\`\`json
{
  "campaigns": [
    {
      "id": 1,
      "name": "Front-end Hero Campaign Q3",
      "product": "Курс Front-end",
      "branch": "Київ",
      "source": "Facebook",
      "status": "active",
      "budget": 15000,
      "spent": 12800,
      "impressions": 245000,
      "clicks": 12250,
      "conversions": 185,
      "revenue": 74000,
      "ctr": 5.0,
      "cpa": 69.19,
      "roas": 5.78
    }
  ],
  "summary": {
    "total_campaigns": 29,
    "active_campaigns": 24,
    "total_budget": 450000,
    "total_spent": 91100,
    "total_revenue": 359000,
    "avg_roas": 4.19
  }
}
\`\`\`

**SQL запрос:**
\`\`\`sql
SELECT 
    c.id,
    c.name,
    p.name as product,
    b.name as branch,
    ts.name as source,
    c.status,
    c.budget,
    SUM(cds.spend) as spent,
    SUM(cds.impressions) as impressions,
    SUM(cds.clicks) as clicks,
    SUM(cds.conversions) as conversions,
    SUM(cds.revenue) as revenue,
    AVG(cds.ctr) as ctr,
    AVG(cds.cpa) as cpa,
    AVG(cds.roas) as roas
FROM campaigns c
JOIN products p ON c.product_id = p.id
JOIN branches b ON c.branch_id = b.id
JOIN traffic_sources ts ON c.source_id = ts.id
LEFT JOIN campaign_daily_stats cds ON c.id = cds.campaign_id
WHERE (:product_id IS NULL OR c.product_id = :product_id)
    AND (:branch_id IS NULL OR c.branch_id = :branch_id)
    AND (:source_id IS NULL OR c.source_id = :source_id)
    AND (:status IS NULL OR c.status = :status)
GROUP BY c.id, c.name, p.name, b.name, ts.name, c.status, c.budget
ORDER BY revenue DESC;
\`\`\`

---

#### 2. GET `/api/campaigns/by-source`
\`\`\`json
{
  "sources": [
    {
      "source": "Facebook",
      "campaigns": 12,
      "revenue": 189600,
      "percentage": 52.8,
      "roas": 4.19,
      "spend": 45200
    }
  ]
}
\`\`\`

---

### Страница креативов - `/creatives`

#### 1. GET `/api/creatives`
\`\`\`json
{
  "creatives": [
    {
      "id": 1,
      "name": "Video Front-end Hero",
      "type": "video",
      "platform": "Facebook",
      "product": "Курс Front-end",
      "branch": "Київ",
      "status": "active",
      "impressions": 125000,
      "clicks": 6500,
      "ctr": 5.2,
      "conversions": 95,
      "cpa": 6.8,
      "roas": 4.5,
      "revenue": 38250,
      "days_active": 28
    }
  ],
  "by_type": [
    {
      "type": "Video",
      "count": 8,
      "avg_roas": 4.2,
      "avg_ctr": 5.8,
      "total_revenue": 156800,
      "trend": "up"
    }
  ]
}
\`\`\`

**SQL запрос:**
\`\`\`sql
SELECT 
    c.id,
    c.name,
    c.type,
    c.platform,
    p.name as product,
    b.name as branch,
    c.status,
    SUM(cds.impressions) as impressions,
    SUM(cds.clicks) as clicks,
    AVG(cds.ctr) as ctr,
    SUM(cds.conversions) as conversions,
    AVG(cds.cpa) as cpa,
    AVG(cds.roas) as roas,
    SUM(cds.revenue) as revenue,
    COUNT(DISTINCT cds.date) as days_active
FROM creatives c
JOIN products p ON c.product_id = p.id
JOIN branches b ON c.branch_id = b.id
LEFT JOIN creative_daily_stats cds ON c.id = cds.creative_id
WHERE c.status = 'active'
    AND cds.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.id, c.name, c.type, c.platform, p.name, b.name, c.status
ORDER BY revenue DESC;
\`\`\`

---

#### 2. GET `/api/creatives/{id}/stats`
**Query params:**
- `start_date`
- `end_date`

\`\`\`json
{
  "daily_stats": [
    {
      "date": "2025-08-01",
      "impressions": 5200,
      "clicks": 280,
      "ctr": 5.4,
      "conversions": 4,
      "spend": 320,
      "revenue": 1600,
      "roas": 5.0
    }
  ]
}
\`\`\`

---

### Страница трафика - `/traffic`

#### 1. GET `/api/traffic/analysis`
\`\`\`json
{
  "by_source": [
    {
      "source": "facebook.com",
      "medium": "cpc",
      "sessions": 12500,
      "users": 8900,
      "bounce_rate": 45.2,
      "avg_duration": 185,
      "conversions": 95,
      "conversion_rate": 0.76,
      "revenue": 38250
    }
  ],
  "by_device": [
    {
      "device": "Desktop",
      "sessions": 45200,
      "conversions": 892,
      "conversion_rate": 1.97,
      "revenue": 425600
    }
  ],
  "by_city": [
    {
      "city": "Київ",
      "sessions": 52000,
      "new_users": 18500,
      "engagement_rate": 71.2
    }
  ]
}
\`\`\`

**SQL запрос:**
\`\`\`sql
SELECT 
    ts.name as source,
    'cpc' as medium,
    COUNT(*) as sessions,
    COUNT(DISTINCT t.user_id) as users,
    AVG(CASE WHEN t.bounce THEN 100 ELSE 0 END) as bounce_rate,
    AVG(t.duration) as avg_duration,
    COUNT(CASE WHEN t.converted THEN 1 END) as conversions,
    (COUNT(CASE WHEN t.converted THEN 1 END)::DECIMAL / COUNT(*) * 100) as conversion_rate,
    COALESCE(SUM(l.contract_value), 0) as revenue
FROM traffic_sessions t
JOIN traffic_sources ts ON t.source_id = ts.id
LEFT JOIN leads l ON l.external_id = t.session_id
WHERE t.started_at >= :start_date 
    AND t.started_at <= :end_date
GROUP BY ts.name;
\`\`\`

---

### Страница конверсий - `/conversions`

#### 1. GET `/api/conversions/events`
\`\`\`json
{
  "events": [
    {
      "event": "page_view",
      "conversions": 125000,
      "rate": 100,
      "revenue": 0
    },
    {
      "event": "form_submit",
      "conversions": 8500,
      "rate": 6.8,
      "revenue": 0
    },
    {
      "event": "contract_signed",
      "conversions": 420,
      "rate": 15.0,
      "revenue": 1680000
    }
  ]
}
\`\`\`

---

#### 2. GET `/api/conversions/by-product`
\`\`\`json
{
  "products": [
    {
      "product": "Курс Front-end",
      "revenue": 680000,
      "contracts": 145,
      "avg_value": 4690,
      "growth": 25.3
    }
  ]
}
\`\`\`

---

### Страница платформ - `/platforms`

#### 1. GET `/api/platforms/facebook`
\`\`\`json
{
  "campaigns": [
    {
      "name": "Front-end Hero Campaign",
      "product": "Курс Front-end",
      "impressions": 125000,
      "clicks": 6500,
      "cpa": 6.8,
      "roas": 4.5
    }
  ],
  "summary": {
    "total_spend": 45200,
    "total_revenue": 189600,
    "roas": 4.19,
    "ctr": 3.25
  }
}
\`\`\`

---

#### 2. GET `/api/platforms/google`
\`\`\`json
{
  "campaigns": [...],
  "keywords": [
    {
      "keyword": "курси програмування",
      "cpc": 1.25,
      "conversions": 45,
      "match_type": "exact"
    }
  ],
  "summary": {
    "total_spend": 38900,
    "total_revenue": 148200,
    "roas": 3.81,
    "quality_score": 8.2
  }
}
\`\`\`

---

### Страница CRM - `/crm`

#### 1. GET `/api/leads`
**Query params:**
- `product_id` (optional)
- `branch_id` (optional)
- `status` (optional)
- `temperature` (optional)

\`\`\`json
{
  "leads": [
    {
      "id": 1,
      "first_name": "Іван",
      "last_name": "Петренко",
      "email": "ivan.petrenko@gmail.com",
      "phone": "+380671234567",
      "age": 28,
      "city": "Київ",
      "product": "Курс Front-end",
      "branch": "IT STEP Київ",
      "source": "Facebook",
      "lead_score": 95,
      "temperature": "hot",
      "status": "contract_signed",
      "contract_value": 4800,
      "created_at": "2025-08-01T10:30:00Z"
    }
  ],
  "summary": {
    "total_leads": 234,
    "hot_leads": 45,
    "warm_leads": 89,
    "cold_leads": 100,
    "avg_score": 72.5,
    "conversion_rate": 18.4
  }
}
\`\`\`

**SQL запрос:**
\`\`\`sql
SELECT 
    l.id,
    l.first_name,
    l.last_name,
    l.email,
    l.phone,
    l.age,
    l.city,
    p.name as product,
    b.name as branch,
    ts.name as source,
    l.lead_score,
    l.temperature,
    l.status,
    l.contract_value,
    l.created_at
FROM leads l
JOIN products p ON l.product_id = p.id
JOIN branches b ON l.branch_id = b.id
JOIN traffic_sources ts ON l.source_id = ts.id
WHERE (:product_id IS NULL OR l.product_id = :product_id)
    AND (:branch_id IS NULL OR l.branch_id = :branch_id)
    AND (:status IS NULL OR l.status = :status)
    AND (:temperature IS NULL OR l.temperature = :temperature)
ORDER BY l.lead_score DESC, l.created_at DESC
LIMIT 100;
\`\`\`

---

#### 2. GET `/api/leads/{id}/interactions`
\`\`\`json
{
  "interactions": [
    {
      "type": "form_submission",
      "date": "2025-08-01T10:30:00Z",
      "details": "Submitted lead form on landing page"
    },
    {
      "type": "phone_call",
      "date": "2025-08-01T15:45:00Z",
      "duration": 420,
      "outcome": "interested",
      "details": "Discussed course details"
    }
  ]
}
\`\`\`

---

### Страница целей - `/goals`

#### 1. GET `/api/goals/burnout`
\`\`\`json
{
  "creatives": [
    {
      "id": 1,
      "name": "Video Front-end Hero",
      "product": "Курс Front-end",
      "platform": "Facebook",
      "current_ctr": 3.2,
      "initial_ctr": 5.2,
      "current_roas": 3.1,
      "initial_roas": 4.5,
      "current_cpa": 89,
      "initial_cpa": 68,
      "days_active": 28,
      "status": "burning",
      "burnout_score": 75,
      "recommendation": "Замініть заголовок на більш емоційний"
    }
  ],
  "summary": {
    "critical": 2,
    "burning": 1,
    "stable": 3
  }
}
\`\`\`

**SQL запрос:**
\`\`\`sql
SELECT 
    creative_id,
    name,
    type,
    platform,
    ctr_7d as current_ctr,
    initial_ctr,
    roas_7d as current_roas,
    initial_roas,
    cpa_30d as current_cpa,
    days_active,
    burnout_score,
    CASE 
        WHEN burnout_score >= 80 THEN 'critical'
        WHEN burnout_score >= 60 THEN 'burning'
        ELSE 'stable'
    END as status
FROM mv_creative_performance
ORDER BY burnout_score DESC;
\`\`\`

---

#### 2. GET `/api/goals/personalization`
\`\`\`json
{
  "comparison": [
    {
      "metric": "CTR",
      "personalized": 6.4,
      "standard": 3.2,
      "improvement": 100
    }
  ],
  "by_audience": [
    {
      "audience": "Студенти 18-24",
      "personalized_ctr": 7.2,
      "standard_ctr": 3.8,
      "personalized_revenue": 45600,
      "standard_revenue": 22800,
      "improvement": 100
    }
  ]
}
\`\`\`

---

#### 3. GET `/api/goals/themes`
\`\`\`json
{
  "themes": [
    {
      "theme": "Кар'єра",
      "creatives_count": 12,
      "ctr": 5.8,
      "cvr": 15.2,
      "cpa": 72,
      "roas": 4.1,
      "total_revenue": 156800,
      "top_audience": "25-34 роки",
      "best_platform": "Facebook"
    }
  ]
}
\`\`\`

---

### Страница настроек - `/settings`

#### 1. GET `/api/settings/user`
\`\`\`json
{
  "user": {
    "id": 1,
    "first_name": "Іван",
    "last_name": "Петренко",
    "email": "ivan.petrenko@planerix.com",
    "role": "admin"
  },
  "notifications": {
    "email": true,
    "push": true,
    "alerts": true,
    "daily_reports": false
  },
  "preferences": {
    "theme": "light",
    "language": "uk",
    "data_retention": "12months",
    "auto_refresh": "15min"
  }
}
\`\`\`

---

## Индексы и Оптимизация

### Основные инд  "12months",
    "auto_refresh": "15min"
  }
}
\`\`\`

---

## Индексы и Оптимизация

### Основные индексы для производительности

\`\`\`sql
-- Индексы для таблицы campaigns
CREATE INDEX CONCURRENTLY idx_campaigns_product_branch ON campaigns(product_id, branch_id);
CREATE INDEX CONCURRENTLY idx_campaigns_source_status ON campaigns(source_id, status);
CREATE INDEX CONCURRENTLY idx_campaigns_dates_active ON campaigns(start_date, end_date) WHERE status = 'active';

-- Индексы для таблицы creatives
CREATE INDEX CONCURRENTLY idx_creatives_product_status ON creatives(product_id, status);
CREATE INDEX CONCURRENTLY idx_creatives_theme_platform ON creatives(theme, platform);
CREATE INDEX CONCURRENTLY idx_creatives_personalized ON creatives(is_personalized) WHERE status = 'active';

-- Индексы для статистики креативов
CREATE INDEX CONCURRENTLY idx_creative_stats_date_creative ON creative_daily_stats(date DESC, creative_id);
CREATE INDEX CONCURRENTLY idx_creative_stats_roas ON creative_daily_stats(roas DESC) WHERE roas > 0;
CREATE INDEX CONCURRENTLY idx_creative_stats_recent ON creative_daily_stats(creative_id, date DESC) WHERE date >= CURRENT_DATE - 30;

-- Индексы для статистики кампаний
CREATE INDEX CONCURRENTLY idx_campaign_stats_date_campaign ON campaign_daily_stats(date DESC, campaign_id);
CREATE INDEX CONCURRENTLY idx_campaign_stats_performance ON campaign_daily_stats(campaign_id, roas DESC, conversion_rate DESC);

-- Индексы для событий воронки
CREATE INDEX CONCURRENTLY idx_funnel_user_timestamp ON funnel_events(user_id, event_timestamp DESC);
CREATE INDEX CONCURRENTLY idx_funnel_campaign_type ON funnel_events(campaign_id, event_type, event_timestamp);
CREATE INDEX CONCURRENTLY idx_funnel_product_stage ON funnel_events(product_id, event_stage);

-- Индексы для лидов
CREATE INDEX CONCURRENTLY idx_leads_product_status_temp ON leads(product_id, status, temperature);
CREATE INDEX CONCURRENTLY idx_leads_branch_created ON leads(branch_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_leads_score_status ON leads(lead_score DESC, status) WHERE status NOT IN ('converted', 'lost');
CREATE INDEX CONCURRENTLY idx_leads_hot ON leads(id, created_at) WHERE temperature = 'hot' AND status = 'new';

-- Индексы для взаимодействий с лидами
CREATE INDEX CONCURRENTLY idx_interactions_lead_date ON lead_interactions(lead_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_interactions_type_outcome ON lead_interactions(type, outcome);

-- Индексы для сессий трафика
CREATE INDEX CONCURRENTLY idx_traffic_source_device ON traffic_sessions(source_id, device_type, started_at);
CREATE INDEX CONCURRENTLY idx_traffic_city_converted ON traffic_sessions(city, converted) WHERE started_at >= CURRENT_DATE - 90;
CREATE INDEX CONCURRENTLY idx_traffic_campaign_date ON traffic_sessions(campaign_id, started_at DESC);

-- Составные индексы для сложных запросов
CREATE INDEX CONCURRENTLY idx_creative_stats_composite ON creative_daily_stats(
    creative_id, 
    date DESC, 
    roas DESC
) WHERE date >= CURRENT_DATE - 90;

CREATE INDEX CONCURRENTLY idx_leads_composite_scoring ON leads(
    product_id,
    branch_id,
    status,
    lead_score DESC
) WHERE status NOT IN ('converted', 'lost');
\`\`\`

---

### Партиционирование больших таблиц

\`\`\`sql
-- Партиционирование таблицы funnel_events по месяцам
CREATE TABLE funnel_events_partitioned (
    LIKE funnel_events INCLUDING ALL
) PARTITION BY RANGE (event_timestamp);

-- Создание партиций на 12 месяцев вперед
CREATE TABLE funnel_events_2025_08 PARTITION OF funnel_events_partitioned
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE funnel_events_2025_09 PARTITION OF funnel_events_partitioned
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

-- Автоматическое создание партиций (функция)
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name text, start_date date)
RETURNS void AS $$
DECLARE
    partition_name text;
    start_month text;
    end_date date;
BEGIN
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    start_month := to_char(start_date, 'YYYY-MM-01');
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_month, end_date);
END;
$$ LANGUAGE plpgsql;

-- Планировщик для создания партиций
SELECT cron.schedule('create-monthly-partitions', '0 0 1 * *', 
    'SELECT create_monthly_partition(''funnel_events_partitioned'', CURRENT_DATE + INTERVAL ''2 months'')');
\`\`\`

---

### Автоматическое обновление материализованных представлений

\`\`\`sql
-- Функция для обновления всех витрин
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    -- Быстрые витрины (каждые 15 минут)
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_overview_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_creative_performance;
    
    -- Средние витрины (каждый час)
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_funnel_analysis;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_traffic_analysis;
    
    -- Тяжелые витрины (раз в день)
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_personalization_comparison;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_theme_analysis;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_lead_scoring;
END;
$$ LANGUAGE plpgsql;

-- Планировщик для обновления витрин
-- Каждые 15 минут - быстрые витрины
SELECT cron.schedule('refresh-fast-views', '*/15 * * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_overview_metrics; 
     REFRESH MATERIALIZED VIEW CONCURRENTLY mv_creative_performance');

-- Каждый час - средние витрины
SELECT cron.schedule('refresh-medium-views', '0 * * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_funnel_analysis;
     REFRESH MATERIALIZED VIEW CONCURRENTLY mv_traffic_analysis');

-- Раз в сутки в 02:00 - тяжелые витрины
SELECT cron.schedule('refresh-heavy-views', '0 2 * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_personalization_comparison;
     REFRESH MATERIALIZED VIEW CONCURRENTLY mv_theme_analysis;
     REFRESH MATERIALIZED VIEW CONCURRENTLY mv_lead_scoring;
     REFRESH MATERIALIZED VIEW CONCURRENTLY mv_goal_progress');
\`\`\`

---

## Триггеры и Автоматизация

### Автоматический расчет метрик

\`\`\`sql
-- Триггер для автоматического расчета CTR, CPA, ROAS
CREATE OR REPLACE FUNCTION calculate_creative_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- CTR (Click-through rate)
    IF NEW.impressions > 0 THEN
        NEW.ctr := (NEW.clicks::DECIMAL / NEW.impressions * 100);
    END IF;
    
    -- CPC (Cost per click)
    IF NEW.clicks > 0 THEN
        NEW.cpc := (NEW.spend / NEW.clicks);
    END IF;
    
    -- CPA (Cost per acquisition)
    IF NEW.conversions > 0 THEN
        NEW.cpa := (NEW.spend / NEW.conversions);
    END IF;
    
    -- CPM (Cost per mille)
    IF NEW.impressions > 0 THEN
        NEW.cpm := (NEW.spend / NEW.impressions * 1000);
    END IF;
    
    -- ROAS (Return on ad spend)
    IF NEW.spend > 0 THEN
        NEW.roas := (NEW.revenue / NEW.spend);
    END IF;
    
    -- CVR (Conversion rate)
    IF NEW.clicks > 0 THEN
        NEW.cvr := (NEW.conversions::DECIMAL / NEW.clicks * 100);
    END IF;
    
    -- Engagement rate
    IF NEW.impressions > 0 THEN
        NEW.engagement_rate := (NEW.engagement_count::DECIMAL / NEW.impressions * 100);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_creative_metrics
    BEFORE INSERT OR UPDATE ON creative_daily_stats
    FOR EACH ROW
    EXECUTE FUNCTION calculate_creative_metrics();

-- Аналогичный триггер для кампаний
CREATE TRIGGER trg_calculate_campaign_metrics
    BEFORE INSERT OR UPDATE ON campaign_daily_stats
    FOR EACH ROW
    EXECUTE FUNCTION calculate_creative_metrics();
\`\`\`

---

### Автоматическое обновление временных меток

\`\`\`sql
-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применение к таблицам
CREATE TRIGGER trg_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_creatives_updated_at
    BEFORE UPDATE ON creatives
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
\`\`\`

---

### Автоматический скоринг лидов

\`\`\`sql
-- Функция для автоматического расчета lead_score
CREATE OR REPLACE FUNCTION calculate_lead_score()
RETURNS TRIGGER AS $$
DECLARE
    interaction_count INT;
    hours_since_created INT;
    source_quality INT;
BEGIN
    -- Количество взаимодействий
    SELECT COUNT(*) INTO interaction_count
    FROM lead_interactions
    WHERE lead_id = NEW.id;
    
    -- Часы с момента создания
    hours_since_created := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - NEW.created_at)) / 3600;
    
    -- Качество источника
    SELECT 
        CASE 
            WHEN name IN ('Facebook', 'Google Ads') THEN 30
            WHEN name IN ('Instagram', 'YouTube') THEN 20
            ELSE 10
        END INTO source_quality
    FROM traffic_sources
    WHERE id = NEW.source_id;
    
    -- Расчет скоринга
    NEW.lead_score := LEAST(100, 
        CASE 
            WHEN interaction_count >= 5 THEN 40
            WHEN interaction_count >= 3 THEN 30
            WHEN interaction_count >= 1 THEN 20
            ELSE 0
        END +
        CASE 
            WHEN hours_since_created <= 24 THEN 30
            WHEN hours_since_created <= 72 THEN 20
            WHEN hours_since_created <= 168 THEN 10
            ELSE 0
        END +
        COALESCE(source_quality, 0)
    );
    
    -- Автоматическая температура
    NEW.temperature := CASE 
        WHEN NEW.lead_score >= 80 THEN 'hot'
        WHEN NEW.lead_score >= 60 THEN 'warm'
        ELSE 'cold'
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_lead_score
    BEFORE INSERT OR UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION calculate_lead_score();

-- Обновление скоринга при добавлении взаимодействия
CREATE OR REPLACE FUNCTION update_lead_score_on_interaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE leads
    SET last_contact_at = CURRENT_TIMESTAMP,
        lead_score = lead_score -- триггер пересчитает автоматически
    WHERE id = NEW.lead_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_lead_score_on_interaction
    AFTER INSERT ON lead_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_score_on_interaction();
\`\`\`

---

## Хранимые Процедуры для API

### Процедура для получения метрик главной страницы

\`\`\`sql
CREATE OR REPLACE FUNCTION get_overview_metrics(
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    date DATE,
    revenue_total DECIMAL,
    revenue_change DECIMAL,
    projects_total INT,
    projects_change DECIMAL,
    conversion_total DECIMAL,
    conversion_change DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.date,
        m.total_revenue,
        CASE 
            WHEN m.prev_revenue > 0 
            THEN ((m.total_revenue - m.prev_revenue) / m.prev_revenue * 100)
            ELSE 0 
        END as revenue_change,
        m.active_projects,
        0.0 as projects_change, -- можно добавить расчет
        m.avg_conversion_rate,
        CASE 
            WHEN m.prev_conversion > 0 
            THEN ((m.avg_conversion_rate - m.prev_conversion) / m.prev_conversion * 100)
            ELSE 0 
        END as conversion_change
    FROM mv_overview_metrics m
    WHERE m.date = p_date
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;
\`\`\`

---

### Процедура для получения воронки

\`\`\`sql
CREATE OR REPLACE FUNCTION get_funnel_analysis(
    p_product_id INT DEFAULT NULL,
    p_branch_id INT DEFAULT NULL,
    p_source_id INT DEFAULT NULL,
    p_start_date DATE DEFAULT CURRENT_DATE - 30,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    stage VARCHAR,
    count BIGINT,
    percentage DECIMAL,
    dropoff_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH funnel_data AS (
        SELECT 
            SUM(impressions) as impressions,
            SUM(clicks) as clicks,
            SUM(landing_views) as landing_views,
            SUM(leads) as leads,
            SUM(calls) as calls,
            SUM(consultations) as consultations,
            SUM(purchases) as purchases
        FROM mv_funnel_analysis
        WHERE date BETWEEN p_start_date AND p_end_date
            AND (p_product_id IS NULL OR product_id = p_product_id)
            AND (p_branch_id IS NULL OR branch_id = p_branch_id)
            AND (p_source_id IS NULL OR source_id = p_source_id)
    )
    SELECT 'Impressions'::VARCHAR, impressions, 100.0::DECIMAL, 0.0::DECIMAL FROM funnel_data
    UNION ALL
    SELECT 'Clicks'::VARCHAR, clicks, 
           (clicks::DECIMAL / NULLIF(impressions, 0) * 100), 
           ((impressions - clicks)::DECIMAL / NULLIF(impressions, 0) * 100)
    FROM funnel_data
    UNION ALL
    SELECT 'Landing Page Views'::VARCHAR, landing_views,
           (landing_views::DECIMAL / NULLIF(clicks, 0) * 100),
           ((clicks - landing_views)::DECIMAL / NULLIF(clicks, 0) * 100)
    FROM funnel_data
    UNION ALL
    SELECT 'Leads'::VARCHAR, leads,
           (leads::DECIMAL / NULLIF(landing_views, 0) * 100),
           ((landing_views - leads)::DECIMAL / NULLIF(landing_views, 0) * 100)
    FROM funnel_data
    UNION ALL
    SELECT 'Phone Calls'::VARCHAR, calls,
           (calls::DECIMAL / NULLIF(leads, 0) * 100),
           ((leads - calls)::DECIMAL / NULLIF(leads, 0) * 100)
    FROM funnel_data
    UNION ALL
    SELECT 'Consultations'::VARCHAR, consultations,
           (consultations::DECIMAL / NULLIF(calls, 0) * 100),
           ((calls - consultations)::DECIMAL / NULLIF(calls, 0) * 100)
    FROM funnel_data
    UNION ALL
    SELECT 'Contracts Signed'::VARCHAR, purchases,
           (purchases::DECIMAL / NULLIF(consultations, 0) * 100),
           ((consultations - purchases)::DECIMAL / NULLIF(consultations, 0) * 100)
    FROM funnel_data;
END;
$$ LANGUAGE plpgsql;
\`\`\`

---

### Процедура для анализа выгорания креативов

\`\`\`sql
CREATE OR REPLACE FUNCTION get_creative_burnout(
    p_min_days_active INT DEFAULT 14
)
RETURNS TABLE (
    creative_id INT,
    name VARCHAR,
    type VARCHAR,
    platform VARCHAR,
    product_id INT,
    current_ctr DECIMAL,
    initial_ctr DECIMAL,
    current_roas DECIMAL,
    initial_roas DECIMAL,
    current_cpa DECIMAL,
    days_active INT,
    burnout_score DECIMAL,
    status VARCHAR,
    recommendation TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.creative_id,
        cp.name,
        cp.type,
        cp.platform,
        cp.product_id,
        cp.ctr_7d,
        cp.initial_ctr,
        cp.roas_7d,
        cp.initial_roas,
        cp.cpa_30d,
        cp.days_active,
        cp.burnout_score,
        CASE 
            WHEN cp.burnout_score >= 80 THEN 'Критично'
            WHEN cp.burnout_score >= 60 THEN 'Вигорає'
            ELSE 'Стабільно'
        END::VARCHAR as status,
        CASE 
            WHEN cp.burnout_score >= 80 THEN 'Повна заміна креативу'
            WHEN cp.burnout_score >= 60 THEN 'Замініть заголовок на більш емоційний'
            WHEN cp.type = 'video' AND cp.burnout_score >= 50 THEN 'Скоротіть тривалість відео'
            ELSE 'Продовжуйте використовувати'
        END::TEXT as recommendation
    FROM mv_creative_performance cp
    WHERE cp.days_active >= p_min_days_active
    ORDER BY cp.burnout_score DESC;
END;
$$ LANGUAGE plpgsql;
\`\`\`

---

## Резервное Копирование и Восстановление

### Скрипт для бэкапа

\`\`\`bash
#!/bin/bash
# backup_planerix.sh

BACKUP_DIR="/var/backups/planerix"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="planerix_analytics"
DB_USER="planerix_user"

# Полный бэкап базы
pg_dump -U $DB_USER -F c -b -v -f "$BACKUP_DIR/full_backup_$DATE.backup" $DB_NAME

# Бэкап только данных (без схемы)
pg_dump -U $DB_USER -F c -a -b -v -f "$BACKUP_DIR/data_backup_$DATE.backup" $DB_NAME

# Бэкап только схемы
pg_dump -U $DB_USER -F c -s -v -f "$BACKUP_DIR/schema_backup_$DATE.backup" $DB_NAME

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "*.backup" -mtime +30 -delete

echo "Backup completed: $DATE"
\`\`\`

---

### Восстановление из бэкапа

\`\`\`bash
#!/bin/bash
# restore_planerix.sh

BACKUP_FILE=$1
DB_NAME="planerix_analytics"
DB_USER="planerix_user"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore_planerix.sh <backup_file>"
    exit 1
fi

# Остановка приложения
systemctl stop planerix-api

# Восстановление базы
pg_restore -U $DB_USER -d $DB_NAME -c -v $BACKUP_FILE

# Обновление материализованных представлений
psql -U $DB_USER -d $DB_NAME -c "SELECT refresh_all_materialized_views();"

# Запуск приложения
systemctl start planerix-api

echo "Restore completed from: $BACKUP_FILE"
\`\`\`

---

## Мониторинг и Производительность

### Запросы для мониторинга

\`\`\`sql
-- Размер таблиц
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- Статистика по индексам
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- Медленные запросы
SELECT 
    calls,
    total_time / 1000 as total_time_sec,
    mean_time / 1000 as mean_time_sec,
    max_time / 1000 as max_time_sec,
    query
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- Активные подключения
SELECT 
    datname,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change,
    LEFT(query, 100) as query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

-- Статистика по материализованным представлениям
SELECT 
    schemaname,
    matviewname,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) AS size,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND relname LIKE 'mv_%';
\`\`\`

---

## Заключение

Эта схема базы данных предоставляет:

1. **Полную структуру таблиц** для всех компонентов приложения
2. **Оптимизированные витрины данных** для быстрых запросов
3. **API endpoints** с примерами запросов и ответов
4. **Индексы и партиционирование** для производительности
5. **Автоматизацию** через триггеры и хранимые процедуры
6. **Мониторинг и бэкапы** для надежности

### Следующие шаги:

1. Создать базу данных и выполнить все CREATE TABLE скрипты
2. Создать материализованные представления
3. Настроить автоматическое обновление витрин
4. Реализовать API endpoints на основе хранимых процедур
5. Настроить мониторинг и алерты
6. Внедрить резервное копирование

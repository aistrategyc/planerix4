# 🔧 Исправление gclid в CRM - Полная Инструкция

**Дата**: 14 октября 2025
**Проблема**: gclid из CRM не совпадает с gclid из Google Ads API

---

## 🔍 ДИАГНОСТИКА ПРОБЛЕМЫ

### Что Происходит Сейчас

**gclid из CRM (code JSONB)**:
```
Cj0KCQjw0NPGBhCDARIsAGAzpp3bCjJICpFJWetfG9ZDgfAgZd9zhdEP1h8S1swAds72m41WE9UmERUaAr3-EALw_wcB
```
- Длина: ~86 символов
- Формат: Base64-like
- Источник: URL параметр из формы заявки

**gclid из Google Ads API (google_ads_clicks)**:
```
EAIaIQobChMIgP7qmJz5jwMVtkeRBR3s7iu5EAAYASAAEgJ-A_D_BwE
```
- Длина: ~48 символов
- Формат: Base64-like (другой)
- Источник: Google Ads API напрямую

### Результат: 0% Совпадений ❌

---

## 🎯 ВОЗМОЖНЫЕ ПРИЧИНЫ

### 1. Разные Версии gclid

**Google использует несколько форматов gclid**:
- **Старый формат** (~2015-2019): Короткие ID
- **Новый формат** (~2019+): Длинные ID с дополнительной информацией
- **Enhanced conversions format**: Ещё длиннее

**Возможно**:
- CRM получает НОВЫЙ формат gclid (из URL)
- Google Ads API возвращает СТАРЫЙ формат gclid (из клика)

---

### 2. gclid Декодируется/Кодируется

**JavaScript в CRM может**:
- Декодировать URL-encoded gclid
- Обрезать лишние параметры
- Добавлять префиксы/суффиксы
- Конвертировать encoding

**Пример**:
```javascript
// Неправильно:
const gclid = decodeURIComponent(urlParams.get('gclid'));
// Может изменить формат!

// Правильно:
const gclid = urlParams.get('gclid');
// Оставить как есть!
```

---

### 3. Google Ads API Возвращает Другой ID

**Google Ads Clicks API**:
- Возвращает `gclid` из таблицы click_view
- Это может быть НЕ тот же gclid что в URL

**Google Ads Conversions API**:
- Принимает gclid для attribution
- Использует ДРУГОЙ формат для хранения

---

## 💡 РЕШЕНИЯ

### ✅ Решение 1: Использовать Google Click ID Conversions API (РЕКОМЕНДУЮ)

#### Что Это?

**Google Ads Conversions API** позволяет отправлять конверсии (заявки) напрямую в Google Ads используя gclid.

**Преимущества**:
- ✅ Google сам сопоставит gclid → keyword
- ✅ Не нужно хранить keywords в своей БД
- ✅ Автоматическая attribution в Google Ads
- ✅ Enhanced conversions support

#### Как Реализовать?

**Шаг 1: Настроить Conversion Action в Google Ads**

1. Google Ads → Tools → Conversions
2. Create Conversion Action → "Import"
3. Choose "Other data sources" → "Track conversions from clicks"
4. Name: "CRM Lead Submission"
5. Category: "Submit lead form"
6. Value: Use different values for each conversion
7. Count: Every conversion

**Шаг 2: Получить Conversion Action ID**

```
Conversion Action ID: customers/CUSTOMER_ID/conversionActions/CONVERSION_ACTION_ID
```

**Шаг 3: Отправлять Conversion при создании заявки**

```python
# API endpoint:
POST https://googleads.googleapis.com/v15/customers/CUSTOMER_ID:uploadClickConversions

# Request body:
{
  "conversions": [
    {
      "gclid": "CjwKCAjw...",  # Из URL формы
      "conversionAction": "customers/CUSTOMER_ID/conversionActions/CONVERSION_ACTION_ID",
      "conversionDateTime": "2025-10-14 12:00:00+03:00",
      "conversionValue": 0,  # или реальная ценность лида
      "currencyCode": "UAH"
    }
  ],
  "partialFailure": true
}
```

**Шаг 4: Google Сам Заполнит Keywords**

- Google сопоставит gclid с кликом
- Автоматически припишет keyword
- Данные появятся в Google Ads отчётах
- Можно экспортировать через API

#### Плюсы и Минусы

**Плюсы**:
- ✅ Не нужно исправлять gclid в CRM
- ✅ Автоматическая attribution
- ✅ Enhanced conversions (лучшее качество данных)
- ✅ Работает "из коробки"

**Минусы**:
- ⚠️ Данные только в Google Ads (не в своей БД)
- ⚠️ Нужна интеграция с Conversions API
- ⚠️ Требует OAuth2 авторизацию

**Время реализации**: 4-6 часов разработки

---

### ✅ Решение 2: Исправить Сохранение gclid в CRM

#### Где Проблема?

**Проверь эти места**:

1. **Frontend форма заявки** (JavaScript):
```javascript
// apps/web-enterprise/src/components/LeadForm.tsx (или аналог)

// ПРОБЛЕМА: Возможно gclid парсится неправильно
const urlParams = new URLSearchParams(window.location.search);
const gclid = urlParams.get('gclid');

// Проверь:
console.log('Raw gclid from URL:', gclid);
console.log('gclid length:', gclid?.length);
```

2. **API endpoint для создания заявки** (Backend):
```python
# apps/api/liderix_api/routes/crm/leads.py (или аналог)

# ПРОБЛЕМА: Возможно gclid обрезается при сохранении
def create_lead(data: LeadSchema):
    gclid = data.code.get('gclid')
    # Проверь:
    logger.info(f"Received gclid: {gclid}, length: {len(gclid)}")
```

3. **Database field type**:
```sql
-- Проверь что поле достаточно длинное
SELECT
  column_name,
  character_maximum_length,
  data_type
FROM information_schema.columns
WHERE table_name = 'crm_requests'
  AND column_name = 'code';
```

#### Как Исправить?

**1. Убедись что gclid НЕ декодируется**:
```javascript
// ❌ НЕПРАВИЛЬНО:
const gclid = decodeURIComponent(params.get('gclid'));

// ✅ ПРАВИЛЬНО:
const gclid = params.get('gclid'); // Как есть!
```

**2. Убедись что gclid НЕ обрезается**:
```javascript
// ❌ НЕПРАВИЛЬНО:
const gclid = params.get('gclid').substring(0, 50);

// ✅ ПРАВИЛЬНО:
const gclid = params.get('gclid'); // Полностью!
```

**3. Убедись что JSONB не ограничивает длину**:
```python
# ✅ ПРАВИЛЬНО: JSONB поддерживает любую длину
code_jsonb = {
    'gclid': gclid,  # До 200+ символов OK
    ...
}
```

#### Тестирование

**Тест 1: Создай тестовую заявку с длинным gclid**:
```
https://yoursite.com/form?gclid=Cj0KCQjw0NPGBhCDARIsAGAzpp3bCjJICpFJWetfG9ZDgfAgZd9zhdEP1h8S1swAds72m41WE9UmERUaAr3-EALw_wcB
```

**Тест 2: Проверь что сохранилось**:
```sql
SELECT
  id_source,
  code->>'gclid' as gclid,
  LENGTH(code->>'gclid') as gclid_length
FROM dashboards.crm_requests
WHERE code->>'gclid' IS NOT NULL
ORDER BY row_created_at DESC
LIMIT 5;
```

**Ожидается**: `gclid_length` = 86+ символов (не 48!)

---

### ✅ Решение 3: Получить gclid Через Google Ads API (СЛОЖНО)

#### Идея

Вместо хранения gclid из URL, получать его из Google Ads API через другие параметры.

#### Проблема

**Google Ads API НЕ предоставляет reverse lookup**:
- Нельзя найти gclid по phone/email
- Нельзя найти gclid по timestamp
- Можно только export всех clicks и искать совпадения

#### Реализация

**1. Export всех clicks**:
```python
# Уже делается в workflow "1.3 GoogleADS RAW"
# Таблица: raw.google_ads_clicks
```

**2. Сопоставить по времени + campaign**:
```sql
-- Найти click близкий по времени к заявке
WITH lead AS (
  SELECT
    id_source,
    request_created_at,
    google_campaign_id
  FROM dashboards.crm_requests
  WHERE id_source = 'TARGET_ID'
)
SELECT
  gac.gclid,
  gac.campaign_id,
  lead.request_created_at,
  gac.date
FROM lead
LEFT JOIN raw.google_ads_clicks gac
  ON gac.campaign_id = lead.google_campaign_id::bigint
  AND gac.date = lead.request_created_at::date
WHERE ABS(EXTRACT(EPOCH FROM (lead.request_created_at - gac.date))) < 3600  -- В течение часа
ORDER BY ABS(EXTRACT(EPOCH FROM (lead.request_created_at - gac.date)))
LIMIT 1;
```

**Проблема**: Очень неточно (десятки кликов в час)

**Вердикт**: ❌ Не рекомендуется

---

## 🎯 МОЯ РЕКОМЕНДАЦИЯ

### Для Быстрого Результата (1 день)

**Используй Решение 1: Google Conversions API**

**Почему**:
- ✅ Не нужно исправлять CRM код
- ✅ Google сам сделает attribution
- ✅ Enhanced conversions (лучше ML модели)
- ✅ Официальный способ от Google

**Что делать**:
1. Настроить Conversion Action в Google Ads (30 минут)
2. Интегрировать Conversions API в CRM (4-6 часов)
3. Отправлять gclid при создании заявки
4. Проверить attribution в Google Ads отчётах

---

### Для Идеального Решения (2-3 дня)

**Исправь Решение 2: Сохранение gclid в CRM**

**Почему**:
- ✅ Данные будут в своей БД
- ✅ Полный контроль
- ✅ Можно строить любые отчёты

**Что делать**:
1. Найти где gclid парсится (Frontend JavaScript)
2. Убедиться что НЕ декодируется
3. Проверить что НЕ обрезается
4. Протестировать с длинными gclid
5. Обновить workflow для новых gclid

---

## 📋 ЧЕКЛИСТ ИСПРАВЛЕНИЯ

### Если Выбрал Решение 1 (Conversions API)

- [ ] Создать Conversion Action в Google Ads
- [ ] Получить Conversion Action ID
- [ ] Получить OAuth2 credentials для Google Ads API
- [ ] Добавить код отправки conversion в CRM при создании заявки
- [ ] Протестировать отправку тестовой conversion
- [ ] Проверить что conversion появился в Google Ads
- [ ] Настроить мониторинг ошибок API
- [ ] Документировать integration

---

### Если Выбрал Решение 2 (Исправить CRM)

- [ ] Найти файл с формой заявки (Frontend)
- [ ] Проверить код парсинга URL параметров
- [ ] Убедиться что gclid НЕ декодируется
- [ ] Убедиться что gclid НЕ обрезается
- [ ] Добавить логирование длины gclid
- [ ] Создать тестовую заявку с длинным gclid
- [ ] Проверить в БД что gclid сохранился полностью
- [ ] Обновить workflow (уже готов!)
- [ ] Подождать новых заявок с правильным gclid
- [ ] Проверить что keywords начали заполняться

---

## 🔍 ДИАГНОСТИКА

### Проверка 1: Какой gclid Приходит в URL?

**Добавь на форму заявки**:
```javascript
// Логирование gclid при загрузке страницы
const urlParams = new URLSearchParams(window.location.search);
const gclid = urlParams.get('gclid');

console.log('=== GCLID DEBUG ===');
console.log('Raw gclid:', gclid);
console.log('Length:', gclid?.length);
console.log('First 10 chars:', gclid?.substring(0, 10));
console.log('Last 10 chars:', gclid?.substring(gclid.length - 10));

// Отправь в аналитику или лог сервер
if (gclid) {
  // analytics.track('gclid_received', { gclid, length: gclid.length });
}
```

---

### Проверка 2: Какой gclid Сохраняется в БД?

```sql
-- Проверить последние 10 заявок с gclid
SELECT
  id_source,
  email,
  code->>'gclid' as gclid,
  LENGTH(code->>'gclid') as gclid_length,
  LEFT(code->>'gclid', 10) as gclid_start,
  RIGHT(code->>'gclid', 10) as gclid_end,
  request_created_at
FROM dashboards.crm_requests
WHERE code->>'gclid' IS NOT NULL
  AND code->>'gclid' <> ''
ORDER BY request_created_at DESC
LIMIT 10;
```

---

### Проверка 3: Какой gclid в Google Ads API?

```sql
-- Проверить clicks из Google Ads
SELECT
  gclid,
  LENGTH(gclid) as length,
  LEFT(gclid, 10) as start,
  RIGHT(gclid, 10) as end,
  campaign_id,
  date
FROM raw.google_ads_clicks
WHERE date >= CURRENT_DATE - 7
ORDER BY date DESC
LIMIT 10;
```

---

### Проверка 4: Пытаемся Найти Совпадения

```sql
-- Пробуем разные способы сопоставления
WITH crm_gclids AS (
  SELECT DISTINCT code->>'gclid' as gclid
  FROM dashboards.crm_requests
  WHERE code->>'gclid' IS NOT NULL
  LIMIT 100
),
api_gclids AS (
  SELECT DISTINCT gclid
  FROM raw.google_ads_clicks
  WHERE date >= CURRENT_DATE - 30
  LIMIT 1000
)
SELECT
  'Exact match' as match_type,
  COUNT(*) as matches
FROM crm_gclids c
JOIN api_gclids a ON a.gclid = c.gclid

UNION ALL

SELECT
  'Starts with (10 chars)',
  COUNT(*)
FROM crm_gclids c
JOIN api_gclids a ON LEFT(a.gclid, 10) = LEFT(c.gclid, 10)

UNION ALL

SELECT
  'Ends with (10 chars)',
  COUNT(*)
FROM crm_gclids c
JOIN api_gclids a ON RIGHT(a.gclid, 10) = RIGHT(c.gclid, 10);
```

---

## 📚 Полезные Ссылки

### Google Ads Conversions API
- [Official Documentation](https://developers.google.com/google-ads/api/docs/conversions/upload-clicks)
- [Click Conversions Guide](https://developers.google.com/google-ads/api/docs/conversions/overview)
- [Enhanced Conversions](https://developers.google.com/google-ads/api/docs/conversions/enhanced-conversions)

### Google Click ID (gclid) Format
- [About gclid](https://support.google.com/google-ads/answer/9744275)
- [Auto-tagging](https://support.google.com/google-ads/answer/3095550)
- [URL parameters](https://support.google.com/google-ads/answer/6305348)

### Python Libraries
```bash
pip install google-ads==23.0.0
```

---

## 🎉 ИТОГО

### Что Я Рекомендую?

**ВАРИАНТ 1: Google Conversions API** (быстро и надёжно)

**Почему**:
- Google официально поддерживает
- Не нужно хранить keywords в своей БД
- Автоматическая attribution
- Enhanced conversions бонусом

**Следующий шаг**:
1. Скажи: "Давай настроим Conversions API"
2. Я дам точный код для интеграции
3. За день всё заработает

---

**Дата**: 14 октября 2025
**Статус**: ✅ Инструкция готова
**Выбор**: За тобой!

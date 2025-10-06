# 🚀 Planerix - Полное руководство по развертыванию и конфигурации

**Обновлено: 6 октября 2025**

## 📋 Содержание
1. [Локальная разработка](#-локальная-разработка)
2. [Продакшн развертывание](#-продакшн-развертывание)
3. [Конфигурационные файлы](#-конфигурационные-файлы)
4. [Переменные окружения](#-переменные-окружения)
5. [Docker конфигурации](#-docker-конфигурации)
6. [Скрипты запуска](#-скрипты-запуска)
7. [База данных и миграции](#-база-данных-и-миграции)
8. [Аналитика и данные](#-аналитика-и-данные)
9. [Troubleshooting](#-troubleshooting)

---

## 🔧 Локальная разработка

### URLs и порты
- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:8001/api
- **Landing**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Команды запуска
```bash
# Быстрый запуск (рекомендуется)
./start-dev.sh

# Ручной запуск
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up --build -d

# Перестройка с нуля (при проблемах)
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d
```

### Остановка
```bash
docker-compose -f docker-compose.dev.yml down
```

---

## 🌐 Продакшн развертывание

### URLs и домены
- **Frontend**: https://app.planerix.com
- **Backend API**: https://api.planerix.com/api
- **Landing**: https://planerix.com
- **Database**: Внутренняя сеть Docker
- **Redis**: Внутренняя сеть Docker

### Команды запуска
```bash
# Запуск продакшн версии
./start-prod.sh

# Ручной запуск
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up --build -d

# Обновление без простоя
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --no-deps --build frontend
docker-compose -f docker-compose.prod.yml up -d --no-deps --build backend
```

---

## ⚙️ Конфигурационные файлы

### 1. Frontend (Next.js) - `apps/web-enterprise/next.config.js`

```javascript
/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  async rewrites() {
    // КРИТИЧЕСКИ ВАЖНО: Разные настройки для dev и prod
    if (process.env.NODE_ENV === 'development') {
      // В dev режиме НЕ перенаправляем, используем локальный backend
      return []
    }

    // В production перенаправляем на prod API
    return [
      {
        source: "/api/:path*",
        destination: "https://api.planerix.com/api/:path*"
      }
    ]
  }
}

module.exports = nextConfig
```

### 2. Backend API конфигурация - `apps/api/liderix_api/config/settings.py`

```python
import os
from typing import Optional

class Settings:
    # Определение окружения
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Database
    LIDERIX_DB_URL: str = os.getenv("LIDERIX_DB_URL", "postgresql+asyncpg://app:app@localhost:5432/app")

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # CORS - разные настройки для dev и prod
    CORS_ORIGINS: list = [
        "http://localhost:3001",  # Landing dev
        "http://localhost:3002",  # Frontend dev
        "https://planerix.com",   # Landing prod
        "https://app.planerix.com"  # Frontend prod
    ] if ENVIRONMENT == "development" else [
        "https://planerix.com",
        "https://app.planerix.com"
    ]

    # JWT
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-prod")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

settings = Settings()
```

---

## 🌍 Переменные окружения

### Development Environment

#### Frontend - `apps/web-enterprise/.env.local`
```bash
# API URLs - ЛОКАЛЬНЫЕ
NEXT_PUBLIC_API_URL=http://localhost:8001/api
INTERNAL_API_URL=http://backend:8001/api
NEXT_PUBLIC_API_PREFIX=/api

# Режим разработки
NODE_ENV=development

# Дополнительные сервисы
NEXT_PUBLIC_AI_AGENT_WEBHOOK_URL=http://localhost:8001/webhook
RESEND_API_KEY=re_7jw2Yip1_4396Z2zxRRtuGLRqZMiVWRJV
RESEND_FROM=notifications@planerix.com
CONTACT_TO=kprolieiev@gmail.com
```

#### Backend - `apps/api/.env`
```bash
# Режим разработки
ENVIRONMENT=development

# Database - ЛОКАЛЬНАЯ
LIDERIX_DB_URL=postgresql+asyncpg://app:app@localhost:5432/app
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_DB=app

# Redis - ЛОКАЛЬНЫЙ
REDIS_URL=redis://localhost:6379/0

# JWT секреты (DEV)
JWT_SECRET_KEY=dev-jwt-secret-key-do-not-use-in-production
JWT_REFRESH_SECRET_KEY=dev-refresh-secret-key

# Безопасность (DEV)
CORS_ORIGINS=http://localhost:3001,http://localhost:3002
ALLOWED_HOSTS=localhost,127.0.0.1
```

#### Root - `.env` (для Docker)
```bash
# Development режим
ENVIRONMENT=development

# PostgreSQL контейнер
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_DB=app

# Порты для development
FRONTEND_PORT=3002
BACKEND_PORT=8001
POSTGRES_PORT=5432
REDIS_PORT=6379
```

### Production Environment

#### Frontend - `apps/web-enterprise/.env.production`
```bash
# API URLs - ПРОДАКШН
NEXT_PUBLIC_API_URL=https://api.planerix.com/api
INTERNAL_API_URL=http://backend:8001/api
NEXT_PUBLIC_API_PREFIX=/api

# Режим продакшн
NODE_ENV=production

# Продакшн сервисы
NEXT_PUBLIC_AI_AGENT_WEBHOOK_URL=https://api.planerix.com/webhook
RESEND_API_KEY=${RESEND_API_KEY}
RESEND_FROM=notifications@planerix.com
CONTACT_TO=kprolieiev@gmail.com
```

#### Backend - `apps/api/.env.production`
```bash
# Режим продакшн
ENVIRONMENT=production

# Database - ПРОДАКШН
LIDERIX_DB_URL=postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}

# Redis - ПРОДАКШН
REDIS_URL=redis://redis:6379/0

# JWT секреты (ПРОДАКШН - ОБЯЗАТЕЛЬНО ИЗМЕНИТЬ!)
JWT_SECRET_KEY=${JWT_SECRET_KEY}
JWT_REFRESH_SECRET_KEY=${JWT_REFRESH_SECRET_KEY}

# Безопасность (ПРОДАКШН)
CORS_ORIGINS=https://planerix.com,https://app.planerix.com
ALLOWED_HOSTS=api.planerix.com,planerix.com
```

#### Root - `.env.production`
```bash
# Production режим
ENVIRONMENT=production

# PostgreSQL контейнер (ПРОДАКШН ПАРОЛИ!)
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}

# JWT секреты (ОБЯЗАТЕЛЬНО БЕЗОПАСНЫЕ!)
JWT_SECRET_KEY=${JWT_SECRET_KEY}
JWT_REFRESH_SECRET_KEY=${JWT_REFRESH_SECRET_KEY}

# SSL сертификаты
CLOUDFLARE_EMAIL=${CLOUDFLARE_EMAIL}
CLOUDFLARE_API_KEY=${CLOUDFLARE_API_KEY}

# Домены
DOMAIN=planerix.com
API_DOMAIN=api.planerix.com
APP_DOMAIN=app.planerix.com
```

---

## 🐳 Docker конфигурации

### Development - `docker-compose.dev.yml`
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=app
      - POSTGRES_DB=app
    ports:
      - "5432:5432"
    volumes:
      - postgres_data_dev:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 30s
      timeout: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5

  backend:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    environment:
      - ENVIRONMENT=development
      - LIDERIX_DB_URL=postgresql+asyncpg://app:app@postgres:5432/app
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 5

  frontend:
    build:
      context: ./apps/web-enterprise
      dockerfile: Dockerfile
    ports:
      - "3002:3001"  # Важно: 3002 снаружи, 3001 внутри
    environment:
      - NODE_ENV=development
      - NEXT_PUBLIC_API_URL=http://localhost:8001/api
      - INTERNAL_API_URL=http://backend:8001/api
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001"]
      interval: 30s
      timeout: 10s
      retries: 5

  landing:
    build:
      context: ./apps/planerix
      dockerfile: Dockerfile
    ports:
      - "3001:3000"  # Landing на 3001
    environment:
      - NODE_ENV=development
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  postgres_data_dev:

networks:
  default:
    name: planerix_dev_network
```

### Production - `docker-compose.prod.yml`
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 30s
      timeout: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    networks:
      - backend
    volumes:
      - redis_data_prod:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5

  backend:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    environment:
      - ENVIRONMENT=production
      - LIDERIX_DB_URL=postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379/0
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      - JWT_REFRESH_SECRET_KEY=${JWT_REFRESH_SECRET_KEY}
    networks:
      - backend
      - frontend
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 5
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.planerix.com`)"
      - "traefik.http.routers.api.tls.certresolver=cloudflare"
      - "traefik.http.services.api.loadbalancer.server.port=8001"

  frontend:
    build:
      context: ./apps/web-enterprise
      dockerfile: Dockerfile
      args:
        - NODE_ENV=production
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.planerix.com/api
      - INTERNAL_API_URL=http://backend:8001/api
    networks:
      - frontend
    depends_on:
      backend:
        condition: service_healthy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`app.planerix.com`)"
      - "traefik.http.routers.app.tls.certresolver=cloudflare"
      - "traefik.http.services.app.loadbalancer.server.port=3001"

  landing:
    build:
      context: ./apps/planerix
      dockerfile: Dockerfile
      args:
        - NODE_ENV=production
    environment:
      - NODE_ENV=production
    networks:
      - frontend
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.landing.rule=Host(`planerix.com`)"
      - "traefik.http.routers.landing.tls.certresolver=cloudflare"
      - "traefik.http.services.landing.loadbalancer.server.port=3000"

  traefik:
    image: traefik:v3.0
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.cloudflare.acme.dnschallenge=true"
      - "--certificatesresolvers.cloudflare.acme.dnschallenge.provider=cloudflare"
      - "--certificatesresolvers.cloudflare.acme.email=${CLOUDFLARE_EMAIL}"
      - "--certificatesresolvers.cloudflare.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Traefik dashboard
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    environment:
      - CF_API_EMAIL=${CLOUDFLARE_EMAIL}
      - CF_API_KEY=${CLOUDFLARE_API_KEY}
    networks:
      - frontend
    labels:
      - "traefik.http.routers.traefik.rule=Host(`traefik.planerix.com`)"
      - "traefik.http.routers.traefik.tls.certresolver=cloudflare"

volumes:
  postgres_data_prod:
  redis_data_prod:

networks:
  frontend:
    external: false
  backend:
    external: false
```

---

## 📜 Скрипты запуска

### Development - `start-dev.sh`
```bash
#!/bin/bash
set -e

echo "🚀 Запуск Planerix в dev режиме..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Останавливаем существующие контейнеры...${NC}"
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true

echo -e "${YELLOW}🧹 Освобождаем порты: 3000 3001 3002 8001 5432 6379${NC}"
# Убиваем процессы на занятых портах
for port in 3000 3001 3002 8001 5432 6379; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "  Убиваем процессы на порту $port..."
        lsof -Pi :$port -sTCP:LISTEN -t | xargs -r kill -9 2>/dev/null || true
    fi
done
echo -e "${GREEN}✅ Все порты свободны${NC}"

echo -e "${BLUE}🚀 Запускаем сервисы...${NC}"
docker-compose -f docker-compose.dev.yml up -d --build

echo -e "${YELLOW}⏳ Ждем готовности сервисов...${NC}"
sleep 15

echo -e "${BLUE}📊 Статус сервисов:${NC}"
docker-compose -f docker-compose.dev.yml ps

echo -e "${BLUE}🔍 Проверяем доступность...${NC}"

# Проверяем backend
if curl -s http://localhost:8001/api/health >/dev/null; then
    echo -e "  Backend (8001): ${GREEN}✅ OK${NC}"
else
    echo -e "  Backend (8001): ${RED}❌ Недоступен${NC}"
fi

# Проверяем frontend
if curl -s -I http://localhost:3002 >/dev/null; then
    echo -e "  Frontend (3002): ${GREEN}✅ OK${NC}"
else
    echo -e "  Frontend (3002): ${RED}❌ Недоступен${NC}"
fi

echo
echo -e "${GREEN}🎉 Готово!${NC}"
echo -e "Frontend: ${BLUE}http://localhost:3002${NC}"
echo -e "Backend API: ${BLUE}http://localhost:8001/api${NC}"
echo -e "Landing: ${BLUE}http://localhost:3001${NC}"
echo -e "Тестовый логин: ${YELLOW}itstep@itstep.com${NC} / ${YELLOW}ITstep2025!${NC}"
echo
echo -e "${YELLOW}Для остановки запустите:${NC} docker-compose -f docker-compose.dev.yml down"
```

### Production - `start-prod.sh`
```bash
#!/bin/bash
set -e

echo "🚀 Запуск Planerix в PRODUCTION режиме..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверяем наличие продакшн переменных
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Файл .env.production не найден!${NC}"
    echo "Создайте файл с продакшн переменными"
    exit 1
fi

# Загружаем продакшн переменные
export $(cat .env.production | grep -v '^#' | xargs)

echo -e "${BLUE}🛑 Останавливаем существующие контейнеры...${NC}"
docker-compose -f docker-compose.prod.yml down

echo -e "${BLUE}📦 Обновляем образы...${NC}"
docker-compose -f docker-compose.prod.yml pull

echo -e "${BLUE}🏗️ Собираем новые образы...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache

echo -e "${BLUE}🚀 Запускаем продакшн сервисы...${NC}"
docker-compose -f docker-compose.prod.yml up -d

echo -e "${YELLOW}⏳ Ждем готовности сервисов...${NC}"
sleep 30

echo -e "${BLUE}📊 Статус сервисов:${NC}"
docker-compose -f docker-compose.prod.yml ps

echo -e "${BLUE}🔍 Проверяем SSL сертификаты...${NC}"
sleep 10

# Проверяем домены
domains=("planerix.com" "app.planerix.com" "api.planerix.com")
for domain in "${domains[@]}"; do
    if curl -s -I "https://$domain" >/dev/null; then
        echo -e "  $domain: ${GREEN}✅ OK${NC}"
    else
        echo -e "  $domain: ${RED}❌ Недоступен${NC}"
    fi
done

echo
echo -e "${GREEN}🎉 Продакшн развертывание завершено!${NC}"
echo -e "Landing: ${BLUE}https://planerix.com${NC}"
echo -e "App: ${BLUE}https://app.planerix.com${NC}"
echo -e "API: ${BLUE}https://api.planerix.com/api${NC}"
echo -e "Traefik Dashboard: ${BLUE}https://traefik.planerix.com${NC}"
echo
echo -e "${YELLOW}Для остановки запустите:${NC} docker-compose -f docker-compose.prod.yml down"
```

### Права доступа для скриптов
```bash
chmod +x start-dev.sh
chmod +x start-prod.sh
```

---

## 🛠️ Troubleshooting

### Проблема: "Still seeing /api/v1/ requests"

**Причина**: Next.js rewrites перенаправляет запросы на продакшн API

**Решение**:
1. Проверьте `next.config.js` - должен быть правильный код с проверкой NODE_ENV
2. Пересоберите frontend: `docker-compose -f docker-compose.dev.yml build --no-cache frontend`
3. Перезапустите: `./start-dev.sh`
4. Очистите кеш браузера (Ctrl+F5)

### Проблема: "Database connection error"

**Решение**:
```bash
# Проверьте переменные окружения
docker-compose -f docker-compose.dev.yml exec backend env | grep POSTGRES

# Проверьте здоровье БД
docker-compose -f docker-compose.dev.yml exec postgres pg_isready -U app -d app

# Примените миграции
docker-compose -f docker-compose.dev.yml exec backend alembic upgrade head
```

### Проблема: "Port already in use"

**Решение**:
```bash
# Автоматически убивает процессы на портах
./start-dev.sh

# Или вручную
sudo lsof -i :3002 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Проблема: "CORS error"

**Проверьте**:
1. `CORS_ORIGINS` в backend настройках
2. Правильные домены в development/production
3. Протокол (http/https) соответствует окружению

### Проблема: "SSL certificates not working"

**Решение**:
```bash
# Проверьте переменные Cloudflare
echo $CLOUDFLARE_EMAIL
echo $CLOUDFLARE_API_KEY

# Перезапустите Traefik
docker-compose -f docker-compose.prod.yml restart traefik

# Проверьте логи
docker-compose -f docker-compose.prod.yml logs traefik
```

---

## 🔒 Безопасность

### Обязательные изменения для продакшн:

1. **JWT секреты** - генерируйте случайные строки:
```bash
openssl rand -hex 32  # Для JWT_SECRET_KEY
openssl rand -hex 32  # Для JWT_REFRESH_SECRET_KEY
```

2. **Пароли БД** - используйте сложные пароли:
```bash
openssl rand -base64 32  # Для POSTGRES_PASSWORD
```

3. **CORS домены** - указывайте только реальные домены

4. **Переменные окружения** - НИКОГДА не коммитьте .env.production

---

## 📝 Контрольный список перед развертыванием

### Development
- [ ] Все сервисы запускаются через `./start-dev.sh`
- [ ] Frontend доступен на http://localhost:3002
- [ ] Backend API отвечает на http://localhost:8001/api/health
- [ ] База данных подключается
- [ ] Нет запросов на /api/v1/

### Production
- [ ] Создан `.env.production` с безопасными секретами
- [ ] Настроены DNS записи для доменов
- [ ] Cloudflare API ключи добавлены
- [ ] SSL сертификаты получены автоматически
- [ ] Все домены доступны по HTTPS
- [ ] Backup стратегия настроена

---

**🎯 РЕЗУЛЬТАТ**: После выполнения этого руководства у вас будет полностью работающая система без путаницы между dev и prod конфигурациями!

## 🚨 КРИТИЧЕСКИ ВАЖНЫЕ ПРАВИЛА

1. **НИКОГДА** не коммитить файлы `.env.production` в git
2. **ВСЕГДА** проверять `NODE_ENV` перед развертыванием
3. **ОБЯЗАТЕЛЬНО** использовать разные базы данных для dev и prod
4. **НИКОГДА** не использовать продакшн API URLs в development
5. **ВСЕГДА** очищать кеш при изменении конфигурации

---

---

## 💾 База данных и миграции

### Миграции Alembic

```bash
# Применить все миграции
docker exec api-backend alembic upgrade head

# Создать новую миграцию
docker exec api-backend alembic revision --autogenerate -m "Description"

# Проверить текущую версию
docker exec api-backend alembic current

# История миграций
docker exec api-backend alembic history

# Откат на предыдущую версию
docker exec api-backend alembic downgrade -1
```

### Важные миграции (сентябрь 2025)

- **2025_09_29-1410**: Пересоздание таблицы notifications
- **2025_09_29-1430**: Исправления аудита backend
- Исправлены конфликты модели KPI - удалены дублирующие файлы

### Состояние моделей

**✅ Рабочие модели:**
- User, Organization, Membership
- Project, Task, ProjectMember
- Analytics (полная аналитическая модель)
- Calendar, Files
- Notifications (пересозданы)

**⚠️ Исправленные проблемы:**
- Удален Project.owner_id (заменен на membership-based access)
- Исправлены конфликты таблицы KPI
- Добавлена функция check_organization_access в permissions

---

## 📊 Аналитика и данные

### Реальные данные в системе

**Период данных:** 31 августа 2025 - 25 сентября 2025

**Статистика:**
- Общие расходы: $6,498.54
- Лиды: 833
- Кампании: 38 активных
- Креативы: 172

### Analytics API Endpoints

```bash
# Обзор дашборда
GET /api/analytics/dashboard/overview?start_date=2025-08-31&end_date=2025-09-25

# Реальное время метрики
GET /api/analytics/realtime

# KPI показатели
GET /api/analytics/kpis?start_date=2025-08-31&end_date=2025-09-25

# Продажи
GET /api/analytics/sales/revenue-trend?start_date=2025-08-31&end_date=2025-09-25
GET /api/analytics/sales/by-products?start_date=2025-08-31&end_date=2025-09-25
GET /api/analytics/sales/funnel?start_date=2025-08-31&end_date=2025-09-25

# Кампании
GET /api/analytics/ads/campaigns?start_date=2025-08-31&end_date=2025-09-25
GET /api/analytics/ads/campaigns/by-products?start_date=2025-08-31&end_date=2025-09-25
GET /api/analytics/ads/campaigns/{id}/daily-trend?start_date=2025-08-31&end_date=2025-09-25

# Креативы
GET /api/analytics/ads/creatives?start_date=2025-08-31&end_date=2025-09-25
GET /api/analytics/ads/creatives/burnout?days_back=30&min_days_active=7
GET /api/analytics/ads/creatives/top-performing?metric=roas&limit=10
```

### Фронтенд хуки аналитики

**Настройка дат:** Frontend настроен на реальные даты данных
- useAnalyticsDateRange: по умолчанию показывает 31.08-25.09.2025
- Все компоненты используют реальный период данных
- Графики и таблицы отображают актуальную информацию

**Основные хуки:**
- useDashboardOverview
- useRealTimeMetrics
- useKPIs
- useRevenueTrend
- useCampaignPerformance
- useCreativePerformance

---

## 🔧 Troubleshooting (обновлено)

### Проблемы с аналитикой

**Пустые графики:**
```bash
# Проверьте реальные даты в БД
docker exec db-postgres psql -U app -d app -c "SELECT MIN(date), MAX(date) FROM campaign_performance_daily;"

# Фронтенд должен использовать эти даты по умолчанию
```

**Ошибки импорта в OKR routes:**
```bash
# Проверьте наличие функции в permissions.py
docker exec api-backend python -c "from liderix_api.services.permissions import check_organization_access; print('OK')"
```

**Конфликты модели KPI:**
```bash
# Очистите кеш и пересоберите
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml build --no-cache backend
```

### Проблемы с проектами

**AttributeError Project.owner:**
- Убедитесь что закомментированы все ссылки на Project.owner_id
- Используйте membership-based access вместо owner_id

### Проблемы с API URL (исправлено 6 октября 2025)

**Симптомы:**
- Запросы идут на `/api/api/auth/login` вместо `/api/auth/login`
- 404 ошибки при логине и других API запросах
- CORS ошибки при попытке авторизации

**Причина:**
`NEXT_PUBLIC_API_URL` уже содержит `/api` суффикс (`http://localhost:8001/api`), но код в `auth-context.tsx` добавлял `/api` еще раз.

**Решение (уже исправлено):**
1. ✅ В `auth-context.tsx` удалён префикс `/api` из всех fetch URL:
   - `/auth/login` вместо `/api/auth/login`
   - `/auth/register` вместо `/api/auth/register`
   - `/auth/refresh` вместо `/api/auth/refresh`
   - `/auth/logout` вместо `/api/auth/logout`
   - `/users/me` вместо `/api/users/me`

2. ✅ Добавлен `.env.production` в `.dockerignore` для предотвращения переопределения build args

3. ✅ Обновлён корневой `.env`: `NEXT_PUBLIC_API_URL=http://localhost:8001/api`

4. ✅ Исправлены CORS настройки - использование конкретных origins вместо wildcard `*`

5. ✅ Увеличен rate limit для `/auth/refresh` с 10 до 100 запросов/час в dev

**Проверка:**
```bash
# В браузере должны быть запросы к:
http://localhost:8001/api/auth/login     # ✅ Правильно
# А НЕ к:
http://localhost:8001/api/api/auth/login # ❌ Неправильно
```

---

*Последнее обновление: 6 октября 2025*
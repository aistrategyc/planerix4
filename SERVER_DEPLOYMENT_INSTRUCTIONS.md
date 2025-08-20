# 🚀 DEPLOYMENT INSTRUCTIONS FOR HETZNER SERVER

## 📋 CRITICAL ENVIRONMENT VARIABLES FIXES

### ⚠️ ПРОБЛЕМЫ ОБНАРУЖЕНЫ:
1. **Frontend URL**: `http://backend:8001/api` не работает в браузере
2. **Docker networking**: Контейнеры не могут общаться между собой
3. **CORS**: Неправильные домены в CORS настройках

## 🔧 КОМАНДЫ ДЛЯ ВЫПОЛНЕНИЯ НА СЕРВЕРЕ

### 1. Подключиться к серверу
```bash
ssh root@planerix.com
# Пароль: qnTWLammUeJg
```

### 2. Перейти в директорию проекта
```bash
cd /path/to/your/monorepo  # Найти где лежит проект
pwd
ls -la
```

### 3. Создать правильные .env файлы

#### Корневой .env.production
```bash
cat > .env.production << 'EOF'
# 🗄️ Database Configuration
POSTGRES_DB=liderixapp
POSTGRES_USER=manfromlamp
POSTGRES_PASSWORD=lashd87123kKJSDAH81
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# 🔒 JWT Configuration
ACCESS_TOKEN_SECRET=4ca687b477f36958b06c5bcccaf97cf17c580d6fec42cfd1648b029c25a827c0
JWT_ALGORITHM=HS256
JWT_AUDIENCE=liderix-clients
JWT_ISSUER=liderix

# 🚀 Application Settings
PROJECT_NAME=Liderix API Production
PROJECT_VERSION=1.0.0
NODE_ENV=production

# 🌍 CORS and External Services
CORS_ALLOW_ORIGINS=https://planerix.com,https://www.planerix.com,https://landing.planerix.com
NEXT_PUBLIC_AI_AGENT_WEBHOOK_URL=https://itstep.app.n8n.cloud/webhook/d644e9d1-78bc-4094-96a2-3504f1256aa7

# 📊 Database Connections
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
CLIENT_DB_POOL_SIZE=5
CLIENT_DB_MAX_OVERFLOW=10

# 🔗 External Database (Read-only ITSTEP)
ITSTEP_DB_URL=postgresql+asyncpg://readonly_itstep:readonly_secure_pass_8391@92.242.60.211:5432/client_itstep

# 📧 Email service (добавить ваши значения)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM=noreply@planerix.com
CONTACT_TO=contact@planerix.com
EOF
```

#### Frontend .env.production
```bash
cat > apps/web-enterprise/.env.production << 'EOF'
### 🌐 PRODUCTION ENVIRONMENT VARIABLES
# ✅ Правильный URL для браузера (через Caddy proxy)
NEXT_PUBLIC_API_URL=https://planerix.com/api
NEXT_PUBLIC_AI_AGENT_WEBHOOK_URL=https://itstep.app.n8n.cloud/webhook/d644e9d1-78bc-4094-96a2-3504f1256aa7
NEXT_PUBLIC_API_PREFIX=/api

### 🚀 Production Settings
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
OUTPUT=standalone
EOF
```

### 4. Создать необходимые директории
```bash
mkdir -p logs
chmod 755 logs
```

### 5. Проверить DNS настройки
```bash
nslookup planerix.com
ping planerix.com
```

### 6. Остановить старые контейнеры (если есть)
```bash
docker-compose down --volumes
docker system prune -f
```

### 7. Запустить production версию
```bash
# Проверить конфигурацию
docker-compose -f docker-compose.prod.yml config

# Построить и запустить
docker-compose -f docker-compose.prod.yml up --build -d

# Проверить статус
docker-compose -f docker-compose.prod.yml ps
```

### 8. Проверить логи
```bash
# Все сервисы
docker-compose -f docker-compose.prod.yml logs -f

# Отдельные сервисы
docker-compose -f docker-compose.prod.yml logs api
docker-compose -f docker-compose.prod.yml logs web
docker-compose -f docker-compose.prod.yml logs caddy
```

### 9. Проверить health checks
```bash
# API
curl http://localhost:8001/api/health

# Caddy health
curl http://localhost:8080/health

# Проверить через домен (может потребоваться время для SSL)
curl -k https://planerix.com/api/health
```

## 🔍 TROUBLESHOOTING

### Если контейнеры не могут общаться:
```bash
# Зайти в web контейнер
docker exec -it liderix-web sh

# Проверить доступность API изнутри
wget -qO- http://api:8001/api/health
nslookup api
```

### Если SSL не работает:
```bash
# Проверить логи Caddy
docker-compose -f docker-compose.prod.yml logs caddy

# Убедиться что домен указывает на сервер
dig planerix.com
```

### Если база данных не подключается:
```bash
# Проверить PostgreSQL
docker exec -it liderix-postgres psql -U manfromlamp -d liderixapp -c "SELECT 1;"
```

## ✅ ПРОВЕРКА ГОТОВНОСТИ

После запуска проверьте:

1. **Главный сайт**: https://planerix.com
2. **API**: https://planerix.com/api/health
3. **Landing**: https://landing.planerix.com (если настроен)

## 🔧 ДОПОЛНИТЕЛЬНЫЕ КОМАНДЫ

### Перезапуск отдельного сервиса:
```bash
docker-compose -f docker-compose.prod.yml restart web
docker-compose -f docker-compose.prod.yml restart api
```

### Обновление кода:
```bash
git pull
docker-compose -f docker-compose.prod.yml up --build -d
```

### Бэкап базы данных:
```bash
docker exec liderix-postgres pg_dump -U manfromlamp liderixapp > backup.sql
```

## 🚨 ВАЖНЫЕ ЗАМЕЧАНИЯ

1. **SSL сертификаты**: Caddy автоматически получит SSL от Let's Encrypt
2. **Домены**: Убедитесь что все домены указывают на IP сервера
3. **Firewall**: Откройте порты 80, 443 на сервере
4. **Мониторинг**: Проверяйте логи регулярно

## 📞 ПОДДЕРЖКА

Если что-то не работает:
1. Проверьте логи: `docker-compose -f docker-compose.prod.yml logs -f`
2. Проверьте статус: `docker-compose -f docker-compose.prod.yml ps`
3. Перезапустите: `docker-compose -f docker-compose.prod.yml restart`
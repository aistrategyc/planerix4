#!/bin/bash
set -e

echo "🚀 Запуск Planerix в dev режиме..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для убиения процессов на портах
kill_ports() {
    local ports=("3000" "3001" "3002" "8001" "5432" "6379")
    echo -e "${YELLOW}🧹 Освобождаем порты: ${ports[*]}${NC}"

    for port in "${ports[@]}"; do
        if lsof -ti:$port >/dev/null 2>&1; then
            echo "  Убиваем процессы на порту $port..."
            lsof -ti:$port | xargs kill -9 2>/dev/null || true
        fi
    done
}

# Функция проверки доступности портов
check_ports() {
    local required_ports=("3002" "8001")
    for port in "${required_ports[@]}"; do
        if lsof -ti:$port >/dev/null 2>&1; then
            echo -e "${RED}❌ Порт $port занят!${NC}"
            return 1
        fi
    done
    return 0
}

# Останавливаем существующие контейнеры
echo -e "${BLUE}🛑 Останавливаем существующие контейнеры...${NC}"
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true

# Убиваем процессы на портах
kill_ports

# Ждем освобождения портов
sleep 2

# Проверяем порты еще раз
if ! check_ports; then
    echo -e "${RED}❌ Не удалось освободить порты. Попробуйте перезапустить скрипт.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Все порты свободны${NC}"

# Запускаем нужные сервисы
echo -e "${BLUE}🚀 Запускаем сервисы...${NC}"
docker-compose -f docker-compose.dev.yml up -d postgres redis backend frontend

# Ждем готовности сервисов
echo -e "${YELLOW}⏳ Ждем готовности сервисов...${NC}"
sleep 10

# Проверяем статус
echo -e "${BLUE}📊 Статус сервисов:${NC}"
docker-compose -f docker-compose.dev.yml ps

# Проверяем доступность
echo -e "${BLUE}🔍 Проверяем доступность...${NC}"

backend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/health || echo "000")
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/ || echo "000")

if [ "$backend_status" = "200" ]; then
    echo -e "  Backend (8001): ${GREEN}✅ OK${NC}"
else
    echo -e "  Backend (8001): ${RED}❌ FAIL (status: $backend_status)${NC}"
fi

if [ "$frontend_status" = "200" ]; then
    echo -e "  Frontend (3002): ${GREEN}✅ OK${NC}"
else
    echo -e "  Frontend (3002): ${RED}❌ FAIL (status: $frontend_status)${NC}"
fi

echo -e "\n${GREEN}🎉 Готово!${NC}"
echo -e "Frontend: ${BLUE}http://localhost:3002${NC}"
echo -e "Backend API: ${BLUE}http://localhost:8001/api${NC}"
echo -e "Тестовый логин: ${YELLOW}itstep@itstep.com${NC} / ${YELLOW}ITstep2025!${NC}"

echo -e "\n${YELLOW}Для остановки запустите:${NC} docker-compose -f docker-compose.dev.yml down"
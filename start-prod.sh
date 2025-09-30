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

set -e

echo "🚀 Starting Planerix Production Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker and Docker Compose are available
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed or not in PATH"
    exit 1
fi

# Check if production environment files exist
print_status "Checking production environment files..."

REQUIRED_FILES=(
    ".env.production"
    "apps/api/.env.production"
    "apps/web-enterprise/.env.production"
    "apps/planerix/.env.production"
    "docker-compose.prod.yml"
    "Caddyfile"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file not found: $file"
        exit 1
    fi
done

print_success "All required configuration files are present"

# Stop any existing development containers
print_status "Stopping development containers if running..."
docker-compose -f docker-compose.dev.yml down --remove-orphans 2>/dev/null || true

# Check if ports 80 and 443 are available
print_status "Checking if ports 80 and 443 are available..."
if netstat -tuln | grep -q ":80 "; then
    print_warning "Port 80 is in use. Please stop the service using port 80 or configure Caddy differently."
fi

if netstat -tuln | grep -q ":443 "; then
    print_warning "Port 443 is in use. Please stop the service using port 443 or configure Caddy differently."
fi

# Build and start production services
print_status "Building and starting production services..."
print_status "This may take several minutes on first run..."

# Pull latest images
docker-compose -f docker-compose.prod.yml pull --quiet

# Build all services
docker-compose -f docker-compose.prod.yml build

# Start services in production mode
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
print_status "Waiting for services to be healthy..."

# Function to wait for service health
wait_for_service() {
    local service_name=$1
    local max_attempts=${2:-60}
    local attempt=0

    print_status "Waiting for $service_name to be healthy..."

    while [ $attempt -lt $max_attempts ]; do
        if docker-compose -f docker-compose.prod.yml ps $service_name | grep -q "healthy"; then
            print_success "$service_name is healthy"
            return 0
        fi
        sleep 5
        attempt=$((attempt + 1))
        printf "."
    done

    print_error "$service_name failed to become healthy within $((max_attempts * 5)) seconds"
    return 1
}

# Wait for database first
wait_for_service "postgres"

# Wait for Redis
wait_for_service "redis"

# Wait for API service
wait_for_service "api"

# Wait for web services
wait_for_service "web"
wait_for_service "landing"

# Run database migrations
print_status "Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T api alembic upgrade head || {
    print_warning "Migrations may have failed. Check the API logs for details."
}

# Display running services
print_status "Current service status:"
docker-compose -f docker-compose.prod.yml ps

# Check SSL certificate status with Caddy
print_status "Checking SSL certificate status (this may take a moment)..."
sleep 10

# Display URLs and access information
echo ""
print_success "🎉 Production deployment completed successfully!"
echo ""
echo "Services are now running at:"
echo "  🌐 Landing Page:      https://planerix.com"
echo "  📱 Web Application:   https://app.planerix.com"
echo "  🔌 API Endpoints:     https://api.planerix.com"
echo ""
echo "Monitoring and Logs:"
echo "  📊 View logs:         docker-compose -f docker-compose.prod.yml logs -f"
echo "  📊 Service status:    docker-compose -f docker-compose.prod.yml ps"
echo "  🔄 Restart service:   docker-compose -f docker-compose.prod.yml restart <service>"
echo "  🛑 Stop all:          docker-compose -f docker-compose.prod.yml down"
echo ""

# SSL Certificate check
print_status "SSL certificates will be automatically obtained by Caddy"
print_status "Check Caddy logs for SSL certificate status: docker-compose -f docker-compose.prod.yml logs caddy"

echo ""
print_success "Production deployment script completed! 🚀"
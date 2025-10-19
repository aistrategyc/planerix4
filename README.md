# Planerix - Enterprise Analytics Platform

🚀 **Production Status**: ✅ **LIVE** (Launched Oct 15, 2025)

A comprehensive enterprise analytics platform built with Next.js, FastAPI, and PostgreSQL.

**Live URL**: https://app.planerix.com

## 🏗️ Architecture

- **Frontend**: Next.js 14 (TypeScript)
  - `apps/web-enterprise/` - Main web application
  - `apps/planerix/` - Landing page
- **Backend**: FastAPI (Python)
  - `apps/api/` - REST API server
- **Database**: PostgreSQL 14 with Redis caching
- **Reverse Proxy**: Caddy (production) with automatic SSL

## 🚀 Quick Start

### Development Environment

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd planerix_new
   ```

2. **Configure Environment**
   ```bash
   # Copy example environment files
   cp .env.development.example .env.local
   cp apps/api/.env.development.example apps/api/.env.local
   cp apps/web-enterprise/.env.development.example apps/web-enterprise/.env.local
   cp apps/planerix/.env.development.example apps/planerix/.env.local

   # Edit the files with your settings
   ```

3. **Start Development Services**
   ```bash
   # Use the development startup script
   ./start-dev.sh

   # Or manually with Docker Compose
   docker-compose -f docker-compose.dev.yml up --build
   ```

4. **Access Applications**
   - Landing Page: http://localhost:3001
   - Web Application: http://localhost:3002
   - API Documentation: http://localhost:8001/docs
   - Database: localhost:5432 (user: app, password: app, database: app)

### Production Deployment

1. **Prepare Production Environment**
   ```bash
   # Copy example production environment files
   cp .env.production.example .env.production
   cp apps/api/.env.production.example apps/api/.env.production
   cp apps/web-enterprise/.env.production.example apps/web-enterprise/.env.production
   cp apps/planerix/.env.production.example apps/planerix/.env.production

   # Edit all files with your production settings
   ```

2. **Configure DNS**
   Point your domains to your server:
   - `planerix.com` → Your server IP
   - `app.planerix.com` → Your server IP
   - `api.planerix.com` → Your server IP

3. **Deploy**
   ```bash
   # Use the production deployment script
   ./start-prod.sh

   # Or manually
   docker-compose -f docker-compose.prod.yml up --build -d
   ```

## 🛠️ Development

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local API development)

### Project Structure

```
planerix_new/
├── apps/
│   ├── api/                    # FastAPI backend
│   │   ├── liderix_api/       # Main API package
│   │   ├── alembic/           # Database migrations
│   │   └── Dockerfile         # API container
│   ├── web-enterprise/        # Main web app
│   │   ├── src/               # Source code
│   │   ├── public/            # Static assets
│   │   └── Dockerfile         # Web app container
│   └── planerix/              # Landing page
│       ├── src/               # Source code
│       └── Dockerfile         # Landing container
├── scripts/                   # Deployment scripts
├── docker-compose.dev.yml     # Development compose
├── docker-compose.prod.yml    # Production compose
├── Caddyfile                  # Production reverse proxy
├── start-dev.sh              # Development startup
└── start-prod.sh             # Production deployment
```

### Common Commands

```bash
# Development
./start-dev.sh                 # Start development environment
docker-compose -f docker-compose.dev.yml logs -f  # View logs

# Production
./start-prod.sh                # Deploy to production
docker-compose -f docker-compose.prod.yml ps      # Service status
docker-compose -f docker-compose.prod.yml logs -f # Production logs

# Database
cd apps/api && alembic upgrade head  # Run migrations
docker exec -it planerix-postgres-prod psql -U app -d app  # Access prod DB

# Cleanup
docker system prune -af        # Clean up Docker
```

### Environment Configuration

#### Development vs Production

| Environment | API URL | Web App Port | Landing Port | Database |
|-------------|---------|--------------|--------------|----------|
| Development | http://localhost:8001 | 3002 | 3001 | localhost:5432 |
| Production | https://api.planerix.com | 443 (HTTPS) | 443 (HTTPS) | Internal |

#### Key Environment Variables

**Development (.env.local)**
```env
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:8001
POSTGRES_USER=app
POSTGRES_PASSWORD=app
POSTGRES_DB=app
```

**Production (.env.production)**
```env
NODE_ENV=production
MAIN_DOMAIN=planerix.com
APP_DOMAIN=app.planerix.com
API_DOMAIN=api.planerix.com
SSL_EMAIL=your-email@planerix.com
NEXT_PUBLIC_API_URL=https://api.planerix.com
```

## 📊 Features

- **Analytics Dashboard**: Real-time business metrics and KPIs
- **Campaign Management**: Marketing campaign tracking and optimization
- **CRM Integration**: Customer relationship management
- **Team Collaboration**: OKRs, tasks, and project management
- **Enterprise Security**: Role-based access control, audit logs

## 🔧 Configuration Files

### Critical Files

1. **next.config.js** - Configures API routing based on environment
2. **docker-compose.*.yml** - Container orchestration
3. **Caddyfile** - Production reverse proxy and SSL
4. **apps/api/.env** - Backend database and API configuration

### Never Edit These Without Understanding

- Database connection strings must match between Docker and API
- Port mappings in docker-compose files
- API URL configurations in Next.js
- Environment-specific configurations

## 🚨 Troubleshooting

### Common Issues

1. **404 API Errors**
   - Check next.config.js rewrites configuration
   - Verify NEXT_PUBLIC_API_URL matches environment
   - Ensure backend is running and healthy

2. **Database Connection Errors**
   - Verify credentials match between .env.postgres and apps/api/.env
   - Check if PostgreSQL container is running
   - Run migrations: `alembic upgrade head`

3. **Port Conflicts**
   - Stop other services using ports 3001, 3002, 8001, 5432, 6379
   - Use `docker-compose down` to stop existing containers

4. **SSL Certificate Issues** (Production)
   - Verify DNS records point to your server
   - Check Caddy logs: `docker logs planerix-caddy-prod`
   - Ensure ports 80 and 443 are open

### Useful Commands

```bash
# Check service health
docker-compose -f docker-compose.dev.yml ps
curl http://localhost:8001/api/health

# View logs
docker-compose -f docker-compose.dev.yml logs backend
docker logs planerix-api-prod

# Reset everything
docker-compose down -v
docker system prune -af
./start-dev.sh
```

## 📝 Development Workflow

1. **Feature Development**
   - Start development environment: `./start-dev.sh`
   - Make changes to code
   - Test locally at http://localhost:3002
   - Submit PR

2. **Database Changes**
   - Create migration: `cd apps/api && alembic revision --autogenerate -m "description"`
   - Test migration: `alembic upgrade head`
   - Include migration in PR

3. **Production Deployment**
   - Update environment files
   - Run production script: `./start-prod.sh`
   - Monitor logs and health checks

## 📚 Documentation

### Current Documentation (Oct 15, 2025)

#### Master Status & Audit
- **[MASTER_STATUS_OCT15_2025.md](./MASTER_STATUS_OCT15_2025.md)** - Complete production status, API inventory, security audit
- **[DETAILED_IMPLEMENTATION_PLAN.md](./DETAILED_IMPLEMENTATION_PLAN.md)** - Full task breakdown and completion status
- **[CLAUDE.md](./CLAUDE.md)** - Project configuration, critical fixes, and historical issues

#### Security & Authentication
- **[FRONTEND_AUTH_COMPLETE_OCT15.md](./FRONTEND_AUTH_COMPLETE_OCT15.md)** - Frontend authentication implementation
- **[PRODUCTION_SECURITY_OCT15.md](./PRODUCTION_SECURITY_OCT15.md)** - Backend security status
- **[AUTHENTICATION_RULES.md](./AUTHENTICATION_RULES.md)** - Authentication system documentation

#### Deployment & Configuration
- **[PRODUCTION_SETUP_COMPLETE_OCT15.md](./PRODUCTION_SETUP_COMPLETE_OCT15.md)** - Production deployment guide
- **[DEPLOYMENT_AND_CONFIGURATION_GUIDE.md](./DEPLOYMENT_AND_CONFIGURATION_GUIDE.md)** - Detailed deployment procedures
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Pre-deployment verification

#### Technical References
- **[CALENDAR_API_IMPLEMENTATION_COMPLETE.md](./CALENDAR_API_IMPLEMENTATION_COMPLETE.md)** - Calendar system documentation
- **[database-schema.md](./database-schema.md)** - Database schema reference
- **[FRONTEND_BACKEND_API_SPECIFICATION.md](./FRONTEND_BACKEND_API_SPECIFICATION.md)** - API contracts

#### Additional Resources
- [API Documentation](http://localhost:8001/docs) - Interactive API docs (development)
- [Archive](./archive/README.md) - Historical documentation (Oct 14 reports, keyword research)

### Quick Documentation Index by Topic

**Need to understand the current state?**
→ Start with [MASTER_STATUS_OCT15_2025.md](./MASTER_STATUS_OCT15_2025.md)

**Need to deploy to production?**
→ Read [PRODUCTION_SETUP_COMPLETE_OCT15.md](./PRODUCTION_SETUP_COMPLETE_OCT15.md)

**Need to implement authentication?**
→ See [FRONTEND_AUTH_COMPLETE_OCT15.md](./FRONTEND_AUTH_COMPLETE_OCT15.md)

**Need to know what's left to do?**
→ Check [DETAILED_IMPLEMENTATION_PLAN.md](./DETAILED_IMPLEMENTATION_PLAN.md)

## 🛡️ Security

- Environment files contain sensitive data - never commit real credentials
- Production uses HTTPS with automatic SSL certificates
- Database backups are automated in production
- Regular security updates recommended

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review logs for error messages
3. Check configuration files match documentation
4. Verify environment setup

---

Built with ❤️ for enterprise analytics

# 1) Базовый образ + pnpm
FROM node:18-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@latest

# 2) Устанавливаем зависимости (lockfile из корня контекста)
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 3) Сборка приложения
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY .env.local .env.local
RUN pnpm build

# 4) Финальный раннер
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@latest

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.env.local ./.env.local

EXPOSE 3000
CMD ["pnpm", "start"]
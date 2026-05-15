# ── Stage 1: install dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps
RUN npm install -g pnpm@9
WORKDIR /app

# Copy workspace manifests first (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

RUN pnpm install --frozen-lockfile --ignore-scripts

# ── Stage 2: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build
RUN npm install -g pnpm@9
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules

COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend
COPY package.json pnpm-workspace.yaml ./

# Generate Prisma client, then compile TypeScript
RUN pnpm --filter @freight-payroll/backend exec prisma generate
RUN pnpm --filter @freight-payroll/backend exec tsc

# ── Stage 3: production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN npm install -g pnpm@9
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/packages/backend/package.json ./packages/backend/
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=build /app/packages/backend/prisma ./packages/backend/prisma
COPY --from=build /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3001

# Run migrations then start
CMD ["sh", "-c", "pnpm --filter @freight-payroll/backend exec prisma migrate deploy && node packages/backend/dist/index.js"]

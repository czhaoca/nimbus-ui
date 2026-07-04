FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Lint/type-check are CI-gated before publish; in-image they duplicate
# work and OOM small runners. Heap cap + serialized static gen (CI=1).
ENV CI=1 NIMBUS_IMAGE_BUILD=1 NODE_OPTIONS="--max-old-space-size=1536"
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]

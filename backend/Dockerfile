# syntax=docker/dockerfile:1.7
#
# Production image for the portfolio API.
#
# Migrations are applied by the start command in docker-compose.prod.yml. The
# Prisma CLI is kept in the image for that purpose (and for one-off release
# commands); if you prefer a separate migration job, remove it from the image and
# run `npx prisma migrate deploy` from CI before starting this container.

FROM node:24-alpine AS build
WORKDIR /app

# Prisma's query engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production \
    PORT=4000 \
    MEDIA_ROOT=/app/storage/media

COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Uploaded files live here; mount a volume so they survive container replacement.
RUN mkdir -p /app/storage/media && chown -R node:node /app
USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:4000/api/health || exit 1

CMD ["node", "dist/index.js"]

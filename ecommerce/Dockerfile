# Dockerfile único do monorepo. Use --build-arg APP=storefront | admin
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /repo

FROM base AS builder
ARG APP=storefront
COPY package.json turbo.json tsconfig.base.json yarn.lock* ./
COPY packages ./packages
COPY apps ./apps
RUN yarn install --network-timeout 600000
RUN yarn workspace @repo/db db:generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn workspace ${APP} build

FROM base AS runner
ARG APP=storefront
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    APP=${APP}
COPY --from=builder /repo ./
EXPOSE 3000 3001
CMD ["sh", "-c", "yarn workspace $APP start"]
